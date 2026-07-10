import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'
const t = async (label: string, fn: () => Promise<any>) => {
  const s = Date.now(); const r = await fn(); console.log(`  ${label}: ${Date.now()-s}ms`); return r
}
const run = async () => {
  const p = await getPayload({ config })
  console.log('Timing createMidAuction-equivalent steps:')
  const queue = await t('1) freeAgentIds (find 328)', async () => {
    const res = await p.find({ collection: 'players', where: { franchise: { exists: false } }, limit: 2000, depth: 0 })
    return res.docs.map((d: any) => d.id)
  })
  console.log(`     queue size = ${queue.length}`)
  await t('2) end live auctions (bulk update where live)', async () =>
    p.update({ collection: 'auctions', where: { status: { equals: 'live' } }, data: { lotStatus: 'idle' } }))
  await t('3) reset 328 players (status/soldPrice) — CURRENT approach', async () =>
    p.update({ collection: 'players', where: { id: { in: queue } }, data: { status: 'available', soldPrice: null } }))
  const a = await t('4) create auction w/ 328-player queue', async () =>
    p.create({ collection: 'auctions', data: { title: '__timing__', kind: 'mid', status: 'scheduled', queue, lotStatus: 'idle' } }))
  await t('5) applyMidGrant (5 franchise updates)', async () => {
    const fr = await p.find({ collection: 'franchises', limit: 200, depth: 0 })
    await Promise.all(fr.docs.map((f: any) => p.update({ collection: 'franchises', id: f.id, data: { purseTotal: f.purseTotal }, overrideAccess: true })))
  })
  await t('cleanup) delete timing auction', async () =>
    p.delete({ collection: 'auctions', where: { id: { equals: a.id } } }))
  process.exit(0)
}
run().catch(e => { console.error(e); process.exit(1) })
