import 'dotenv/config'
import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getPayload } from 'payload'
import config from '../payload.config'
import { PLAYER_CATEGORIES, POSITIONS } from '../lib/constants'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const CSV_PATH = path.resolve(dirname, '../../data/2kplayerlist.csv')

const COMMISH_EMAIL = process.env.SEED_COMMISSIONER_EMAIL || 'commissioner@2kdais.local'
const COMMISH_PASSWORD = process.env.SEED_COMMISSIONER_PASSWORD || 'changeme123'

type Row = {
  rank: number
  name: string
  nbaTeam: string
  category: string
  position: string
  ovr: number
}

function parseCsv(raw: string): Row[] {
  const lines = raw.trim().split(/\r?\n/)
  lines.shift() // header: Rank,Player,Team,Category,Position,OVR
  return lines
    .map((line) => {
      const [rank, name, team, category, position, ovr] = line.split(',')
      return {
        rank: Number(rank),
        name: name?.trim(),
        nbaTeam: team?.trim(),
        category: category?.trim(),
        position: position?.trim(),
        ovr: Number(ovr),
      }
    })
    .filter((r) => r.name && !Number.isNaN(r.ovr))
}

async function run() {
  const force = process.argv.includes('--force')
  const payload = await getPayload({ config: await config })

  // 1. Commissioner account
  const existingUsers = await payload.count({ collection: 'users' })
  if (existingUsers.totalDocs === 0) {
    await payload.create({
      collection: 'users',
      data: {
        name: 'Commissioner',
        email: COMMISH_EMAIL,
        password: COMMISH_PASSWORD,
        role: 'commissioner',
      },
    })
    payload.logger.info(`✓ Created commissioner: ${COMMISH_EMAIL} / ${COMMISH_PASSWORD}`)
  } else {
    payload.logger.info('• Users already exist — skipping commissioner bootstrap.')
  }

  // 2. Players from CSV
  const existing = await payload.count({ collection: 'players' })
  if (existing.totalDocs > 0 && !force) {
    payload.logger.warn(
      `• ${existing.totalDocs} players already exist. Re-run with --force to wipe and reimport.`,
    )
  } else {
    if (existing.totalDocs > 0 && force) {
      payload.logger.info('… --force: deleting existing players')
      await payload.delete({ collection: 'players', where: { id: { exists: true } } })
    }

    const rows = parseCsv(readFileSync(CSV_PATH, 'utf8'))
    payload.logger.info(`Importing ${rows.length} players from CSV…`)

    let ok = 0
    for (const r of rows) {
      const category = (PLAYER_CATEGORIES as readonly string[]).includes(r.category)
        ? r.category
        : undefined
      const position = (POSITIONS as readonly string[]).includes(r.position)
        ? r.position
        : 'SF'
      try {
        await payload.create({
          collection: 'players',
          data: {
            rank: r.rank,
            name: r.name,
            nbaTeam: r.nbaTeam,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            category: category as any,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            position: position as any,
            ovr: r.ovr,
            status: 'available',
          },
        })
        ok++
        if (ok % 50 === 0) payload.logger.info(`  …${ok}/${rows.length}`)
      } catch (e) {
        payload.logger.error(`  ✗ ${r.name}: ${(e as Error).message}`)
      }
    }
    payload.logger.info(`✓ Imported ${ok}/${rows.length} players.`)
  }

  // 3. League settings defaults (touch the global so it exists)
  await payload.updateGlobal({
    slug: 'league-settings',
    data: { seasonName: 'Season 1' },
  })
  payload.logger.info('✓ League settings initialised.')

  payload.logger.info('🏀 Seed complete.')
  process.exit(0)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
