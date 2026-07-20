import { notFound } from 'next/navigation'
import { Trophy } from '@phosphor-icons/react/dist/ssr'
import { getPayloadClient } from '@/lib/payload'
import { PageHeader } from '@/components/ui-bits'
import { DbErrorToast } from '@/components/db-error-toast'
import { PageSkeleton } from '@/components/skeletons'
import { TournamentDetail, type DetailParticipant, type DetailGame } from './tournament-detail'
import { TripleThreatBoard, type TTPlayerView, type TTMatchView } from './triple-threat'
import { readTriple } from '@/lib/triple-threat'

export const dynamic = 'force-dynamic' // never cache a transient DB blip (would be served for the whole revalidate window)

const PRIMARY = '#DF2604'

// Prerender existing tournament pages at build; new ones render on-demand then
// cache (dynamicParams defaults to true).
export async function generateStaticParams() {
  try {
    const payload = await getPayloadClient()
    const res = await payload.find({ collection: 'tournaments', limit: 200, depth: 0 })
    return res.docs.map((t) => ({ id: String(t.id) }))
  } catch {
    return []
  }
}

/** Games live in the tournament's `bracket` JSON column. */
function readGames(bracket: unknown): DetailGame[] {
  const arr =
    bracket && typeof bracket === 'object' && Array.isArray((bracket as { games?: unknown }).games)
      ? ((bracket as { games: unknown[] }).games as Record<string, unknown>[])
      : []
  return arr.map((g) => {
    const a = (g.a ?? {}) as { owners?: unknown[]; team?: string | null }
    const b = (g.b ?? {}) as { owners?: unknown[]; team?: string | null }
    return {
      id: String(g.id),
      format: g.format === '2v2' ? '2v2' : '1v1',
      a: { owners: (a.owners ?? []).map(String), team: a.team ?? null },
      b: { owners: (b.owners ?? []).map(String), team: b.team ?? null },
      scoreA: (g.scoreA as number) ?? null,
      scoreB: (g.scoreB as number) ?? null,
      walkover: !!g.walkover,
    }
  })
}

export default async function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let payload
  try {
    payload = await getPayloadClient()
  } catch {
    return (
      <>
        <DbErrorToast />
        <PageSkeleton />
      </>
    )
  }

  let t
  try {
    t = await payload.findByID({ collection: 'tournaments', id, depth: 1 })
  } catch {
    notFound()
  }
  if (!t) notFound()

  // Participants are franchises — but we display the OWNER name (team as fallback).
  const participants: DetailParticipant[] = (Array.isArray(t.participants) ? t.participants : [])
    .filter((p): p is Exclude<typeof p, number> => typeof p === 'object' && p !== null)
    .map((p) => ({
      id: String(p.id),
      owner: p.ownerName || p.name || '—',
      color: p.color || PRIMARY,
    }))

  // Triple Threat tournaments own a bespoke 3-game gauntlet board.
  const triple = readTriple(t.bracket)
  if (triple) {
    const byId = new Map(participants.map((p) => [p.id, p]))
    const players: TTPlayerView[] = triple.players
      .map((pid) => byId.get(String(pid)))
      .filter((p): p is DetailParticipant => !!p)
      .map((p) => ({ id: p.id, owner: p.owner, color: p.color }))
    const matches: TTMatchView[] = triple.matches.map((m) => ({
      slot: m.slot,
      home: String(m.home),
      away: String(m.away),
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      walkover: m.walkover,
    }))
    const championId = triple.champion != null ? String(triple.champion) : null

    return (
      <div>
        <PageHeader
          title={t.name}
          icon={Trophy}
          subtitle="Triple Threat · 3-player gauntlet · one ring"
        />
        <TripleThreatBoard
          tournamentId={t.id as number}
          players={players}
          matches={matches}
          championId={championId}
        />
      </div>
    )
  }

  const games = readGames(t.bracket)

  return (
    <div>
      <PageHeader title={t.name} icon={Trophy} subtitle={`${participants.length} owners competing`} />

      <section className="mb-6">
        <h2 className="mb-3 font-display text-xl font-black uppercase tracking-tight">Participants</h2>
        {participants.length ? (
          <div className="flex flex-wrap gap-2">
            {participants.map((p) => (
              <span key={p.id} className="skeuo inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold">
                <span className="size-2.5 rounded-full" style={{ background: p.color }} />
                {p.owner}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No participants added yet.</p>
        )}
      </section>

      <TournamentDetail tournamentId={t.id as number} participants={participants} games={games} />
    </div>
  )
}
