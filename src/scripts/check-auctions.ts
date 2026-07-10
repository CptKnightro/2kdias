import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'

const run = async () => {
  const p = await getPayload({ config })
  const a = await p.find({ collection: 'auctions', sort: '-createdAt', limit: 5, depth: 0 })
  console.log(`Auctions: ${a.totalDocs}`)
  for (const x of a.docs)
    console.log(
      `  #${x.id} "${x.title}" · ${x.kind} · ${x.status} · lot:${x.lotStatus} · queue:${Array.isArray(x.queue) ? x.queue.length : 0}`,
    )
  const fr = await p.find({ collection: 'franchises', sort: 'name', limit: 50, depth: 0 })
  console.log('\nFranchise wallets:')
  for (const f of fr.docs) console.log(`  ${f.name}: purseTotal=${f.purseTotal} spent=${f.purseSpent}`)
  process.exit(0)
}
run().catch((e) => {
  console.error(e)
  process.exit(1)
})
