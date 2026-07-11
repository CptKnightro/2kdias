/**
 * Resolve an NBA team name (current, all-time, or a relocated/historical
 * franchise) to a locally-hosted team logo in /public/logos/nba.
 *
 * The player pool stores `nbaTeam` as free text — "Denver Nuggets",
 * "All-Time Chicago Bulls", "All-Time Seattle SuperSonics", etc. We strip the
 * "All-Time " prefix and fold historical franchises onto their modern logo, so
 * every real team resolves. All-Decade / All-Star / Conference groupings have
 * no single team and return null (the caller shows a fallback).
 *
 * Codes follow ESPN's logo slugs; the PNGs were mirrored from ESPN's CDN.
 */
const ABBR: Record<string, string> = {
  'atlanta hawks': 'atl',
  'boston celtics': 'bos',
  'brooklyn nets': 'bkn',
  'charlotte hornets': 'cha',
  'chicago bulls': 'chi',
  'cleveland cavaliers': 'cle',
  'dallas mavericks': 'dal',
  'denver nuggets': 'den',
  'detroit pistons': 'det',
  'golden state warriors': 'gs',
  'houston rockets': 'hou',
  'indiana pacers': 'ind',
  'los angeles clippers': 'lac',
  'la clippers': 'lac',
  'los angeles lakers': 'lal',
  'la lakers': 'lal',
  'memphis grizzlies': 'mem',
  'miami heat': 'mia',
  'milwaukee bucks': 'mil',
  'minnesota timberwolves': 'min',
  'new orleans pelicans': 'no',
  'new york knicks': 'ny',
  'oklahoma city thunder': 'okc',
  'orlando magic': 'orl',
  'philadelphia 76ers': 'phi',
  'phoenix suns': 'phx',
  'portland trail blazers': 'por',
  'sacramento kings': 'sac',
  'san antonio spurs': 'sa',
  'toronto raptors': 'tor',
  'utah jazz': 'utah',
  'washington wizards': 'wsh',

  // ── relocated / historical franchises → modern logo ──────────────
  'seattle supersonics': 'okc',
  'new jersey nets': 'bkn',
  'washington bullets': 'wsh',
  'baltimore bullets': 'wsh',
  'buffalo braves': 'lac',
  'san diego clippers': 'lac',
  'new orleans jazz': 'utah',
  'new orleans/oklahoma city hornets': 'no',
  'charlotte bobcats': 'cha',
  'kansas city kings': 'sac',
  'kansas city-omaha kings': 'sac',
  'cincinnati royals': 'sac',
  'rochester royals': 'sac',
  'st. louis hawks': 'atl',
  'st louis hawks': 'atl',
  'milwaukee hawks': 'atl',
  'tri-cities blackhawks': 'atl',
  'fort wayne pistons': 'det',
  'ft. wayne pistons': 'det',
  'minneapolis lakers': 'lal',
  'philadelphia warriors': 'gs',
  'san francisco warriors': 'gs',
  'syracuse nationals': 'phi',
  'vancouver grizzlies': 'mem',
  'san diego rockets': 'hou',
  'chicago packers': 'wsh',
  'chicago zephyrs': 'wsh',
}

/** Team abbreviation slug, or null for non-team groupings / unknown names. */
export function nbaTeamCode(team?: string | null): string | null {
  if (!team) return null
  const key = team.trim().toLowerCase().replace(/^all[-\s]?time\s+/, '')
  if (/all[-\s]?decade|all[-\s]?star|conference/.test(key)) return null
  return ABBR[key] ?? null
}

/** Local logo path, or null when no team logo applies. */
export function nbaLogoSrc(team?: string | null): string | null {
  const code = nbaTeamCode(team)
  return code ? `/logos/nba/${code}.png` : null
}

/** True when the name is an all-time / all-decade / all-star style card. */
export function isAllTimeTeam(team?: string | null): boolean {
  if (!team) return false
  return /all[-\s]?time|all[-\s]?decade|all[-\s]?star/i.test(team)
}
