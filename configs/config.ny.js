{
  stateName:   'New York',
  agencyName:  'New York State Gaming Commission (NYSGC)',
  agencyShort: 'NYSGC',
  tabs: {
    tab1: { label: 'Pari-Mutuel / ADW',        sourceLabel: 'ADW System' },
    tab2: { label: 'Sports Wagering',           sourceLabel: 'Sportsbook Platform' },
    tab3: { label: 'Commercial Casino / VLT',   sourceLabel: 'Casino Reporting System' },
    tab4: { label: 'Patron Identity',           badge: 'Powered by P3RL + Delta Sharing' },
  },
  operators: [
    { id: 'op1', name: 'NYRA / TwinSpires',      vertical: 'tab1' },
    { id: 'op2', name: 'Off-Track Betting (OTB)', vertical: 'tab1' },
    { id: 'op3', name: 'FanDuel Sportsbook',      vertical: 'tab2' },
    { id: 'op4', name: 'DraftKings Sportsbook',   vertical: 'tab2' },
    { id: 'op5', name: 'Caesars Sportsbook',      vertical: 'tab2' },
    { id: 'op6', name: 'MGM Resorts / BetMGM',   vertical: 'tab3' },
    { id: 'op7', name: 'Resorts World Casino',    vertical: 'tab3' },
  ],
  dataScale: {
    tab1_base_wager_volume:  14_000_000,
    tab2_base_wager_volume:  20_000_000,
    tab3_base_receipts:       8_000_000,
    patron_population:       2_000_000,
    active_exclusions:          22_000,
  },
  seasonLabel: 'Current Season (Sep–Jan)',
  seasonStart: '2025-09-01',
  seasonEnd:   '2026-01-31',
  stateWeights: [
    ['NY', 400], ['NJ', 40], ['CT', 20], ['PA', 15], ['FL', 8],
    ['MA', 6],   ['CA', 4],  ['TX', 3],  ['OH', 2],  ['IL', 2],
  ],
}