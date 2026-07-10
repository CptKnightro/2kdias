import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'

const PURSE_TOTAL = 600

// owner display name, login email, team name
const TEAMS = [
  { owner: 'Mandy', email: 'mandy@2kdais.local', team: 'Raptors', color: '#7036B9' },
  { owner: 'Staines', email: 'staines@2kdais.local', team: 'Nets', color: '#FFFFFF' },
  { owner: 'Omar', email: 'omar@2kdais.local', team: 'Thunders', color: '#007AC1' },
  { owner: 'AJ', email: 'aj@2kdais.local', team: 'Heat', color: '#98002E' },
  { owner: 'Lash', email: 'lash@2kdais.local', team: 'Lakers', color: '#FDB927' },
]

// roster[team] = [exact DB player name, price]
const ROSTER: Record<string, [string, number][]> = {
  Raptors: [
    ['Stephen Curry', 90],
    ['John Stockton', 40],
    ['Fat Lever', 20],
    ['Anthony Davis', 30],
    ['Elgin Baylor', 40],
    ['Michael Jordan', 80],
    ['Anthony Edwards', 45],
    ['Nikola Jokic', 45],
    ['Wilt Chamberlain', 85],
    ['Hedo Turkoglu', 25],
    ['Grant Hill', 30],
    ['Paolo Banchero', 20],
    ['Penny Hardaway', 30],
    ['Cooper Flagg', 20],
  ],
  Nets: [
    ['Magic Johnson', 70],
    ['Clyde Drexler', 40],
    ['Larry Bird', 75],
    ['Dominique Wilkins', 40],
    ['Dirk Nowitzki', 85],
    ['David Robinson', 40],
    ['Luka Doncic', 40],
    ['Victor Wembanyama', 75],
    ['Russell Westbrook', 20],
    ['George Gervin', 25],
    ['Ray Allen', 50],
    ['James Harden', 30],
  ],
  Thunders: [
    ['LaMelo Ball', 30],
    ['Carmelo Anthony', 40],
    ['Kevin Durant', 115],
    ['Julius Erving', 70],
    ['Vince Carter', 60],
    ['Damian Lillard', 30],
    ['Jimmy Butler', 30],
    ['Bob McAdoo', 30],
    ['Tyrese Maxey', 30],
    ['Zach LaVine', 30],
    ['Paul George', 30],
    ['LeBron James', 50],
    ['Shaquille O\'Neal', 55],
  ],
  Heat: [
    ['Shai Gilgeous-Alexander', 70],
    ['Kobe Bryant', 90],
    ['Jayson Tatum', 60],
    ['Giannis Antetokounmpo', 60],
    ['Amen Thompson', 20],
    ['Hakeem Olajuwon', 60],
    ['Klay Thompson', 40],
    ['Kawhi Leonard', 70],
    ['Marcus Smart', 20],
    ['Devin Booker', 30],
    ['Cade Cunningham', 40],
    ['Ja Morant', 20],
  ],
  Lakers: [
    ['Jerry West', 70],
    ['Tracy McGrady', 60],
    ['Tim Duncan', 85],
    ['Kevin Garnett', 75],
    ['Kareem Abdul-Jabbar', 60],
    ['Oscar Robertson', 60],
    ['Karl Malone', 40],
    ['Scottie Pippen', 55],
    ['Dwyane Wade', 35],
    ['Jaylen Brown', 30],
    ['Austin Reaves', 10],
    ['Bob Cousy', 20],
  ],
}

// Players not in the CSV pool — created on the fly. Tweak OVR/position in admin.
const CREATE_IF_MISSING: Record<string, { ovr: number; position: string; nbaTeam: string }> = {
  'Grant Hill': { ovr: 90, position: 'SF', nbaTeam: 'All-Time Detroit Pistons' },
  'George Gervin': { ovr: 92, position: 'SG', nbaTeam: 'All-Time San Antonio Spurs' },
}

async function run() {
  const payload = await getPayload({ config: await config })
  const log = payload.logger

  for (const t of TEAMS) {
    // 1. owner user
    const existingUser = await payload.find({
      collection: 'users',
      where: { email: { equals: t.email } },
      limit: 1,
    })
    let userId = existingUser.docs[0]?.id
    if (!userId) {
      const u = await payload.create({
        collection: 'users',
        data: { name: t.owner, email: t.email, password: 'changeme123', role: 'owner' },
      })
      userId = u.id
      log.info(`✓ owner ${t.owner} (${t.email} / changeme123)`)
    }

    // 2. franchise
    const existingTeam = await payload.find({
      collection: 'franchises',
      where: { name: { equals: t.team } },
      limit: 1,
    })
    let teamId = existingTeam.docs[0]?.id
    if (!teamId) {
      const fr = await payload.create({
        collection: 'franchises',
        data: {
          name: t.team,
          color: t.color,
          owner: userId,
          purseTotal: PURSE_TOTAL,
          purseSpent: 0,
          established: 1,
        },
      })
      teamId = fr.id
      log.info(`✓ team ${t.team}`)
    }
    // link user -> franchise
    await payload.update({ collection: 'users', id: userId, data: { franchise: teamId } })

    // 3. assign roster
    let spent = 0
    for (const [name, price] of ROSTER[t.team]) {
      let player = (
        await payload.find({ collection: 'players', where: { name: { equals: name } }, limit: 1 })
      ).docs[0]

      if (!player && CREATE_IF_MISSING[name]) {
        const spec = CREATE_IF_MISSING[name]
        player = await payload.create({
          collection: 'players',
          data: {
            name,
            ovr: spec.ovr,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            position: spec.position as any,
            nbaTeam: spec.nbaTeam,
            category: 'All-Time Legend',
            status: 'available',
          },
        })
        log.warn(`  + created missing player ${name} (OVR ${spec.ovr} — adjust in admin)`)
      }

      if (!player) {
        log.error(`  ✗ NOT FOUND: ${name} (${t.team})`)
        continue
      }

      await payload.update({
        collection: 'players',
        id: player.id,
        data: { status: 'sold', franchise: teamId, soldPrice: price },
      })
      spent += price
    }

    await payload.update({
      collection: 'franchises',
      id: teamId,
      data: { purseSpent: spent },
    })
    log.info(`✓ ${t.team}: ${ROSTER[t.team].length} players, ${spent} spent / ${PURSE_TOTAL}`)
  }

  // activity marker
  await payload.create({
    collection: 'activity',
    data: { type: 'system', message: 'Auction 1 results imported — 5 franchises formed.' },
  })

  log.info('🏀 Auction 1 import complete.')
  process.exit(0)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
