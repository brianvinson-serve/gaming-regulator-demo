{
  stateName:   'Louisiana',
  agencyName:  'Louisiana Gaming Control Board (LGCB) + Louisiana Racing Commission (LRC)',
  agencyShort: 'LGCB + LRC',
  tabs: {
    tab1: { label: 'Pari-Mutuel / Racing',  sourceLabel: 'LRC Racing System' },
    tab2: { label: 'Sports Wagering',        sourceLabel: 'Sportsbook Platform' },
    tab3: { label: 'Charitable Gaming',      sourceLabel: 'Charitable Gaming Registry' },
    tab4: { label: 'Patron Identity',        badge: 'Powered by P3RL + Delta Sharing' },
  },
  operators: [
    { id: 'op1', name: 'Fair Grounds / TwinSpires', vertical: 'tab1' },
    { id: 'op2', name: 'Delta Downs ADW',            vertical: 'tab1' },
    { id: 'op3', name: 'FanDuel Sportsbook',         vertical: 'tab2' },
    { id: 'op4', name: 'DraftKings Sportsbook',      vertical: 'tab2' },
    { id: 'op5', name: 'Caesars Sportsbook',         vertical: 'tab2' },
    { id: 'op6', name: 'Charitable Gaming Registry', vertical: 'tab3' },
  ],
  dataScale: {
    tab1_base_wager_volume:    900_000,
    tab2_base_wager_volume:  1_500_000,
    tab3_base_receipts:        380_000,
    patron_population:         220_000,
    active_exclusions:           4_200,
  },
  seasonLabel: 'Current Season (Sep–Apr)',
  seasonStart: '2025-09-01',
  seasonEnd:   '2026-04-30',
  stateWeights: [
    ['LA', 350], ['TX', 30], ['MS', 18], ['AR', 10], ['TN', 8],
    ['AL', 6],   ['FL', 5],  ['GA', 3],  ['OK', 2],  ['MO', 2],
  ],
}