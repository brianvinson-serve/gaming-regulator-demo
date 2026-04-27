{
  stateName:   'Kentucky',
  agencyName:  'Kentucky Horse Racing & Gaming Corporation (KHRGC)',
  agencyShort: 'KHRGC',
  tabs: {
    tab1: { label: 'Pari-Mutuel / ADW',   sourceLabel: 'ADW System' },
    tab2: { label: 'Sports Wagering',      sourceLabel: 'Sportsbook Platform' },
    tab3: { label: 'Charitable Gaming',    sourceLabel: 'Charitable Gaming Registry' },
    tab4: { label: 'Patron Identity',      badge: 'Powered by P3RL + Delta Sharing' },
  },
  operators: [
    { id: 'op1', name: 'Churchill Downs ADW',    vertical: 'tab1' },
    { id: 'op2', name: 'Keeneland ADW',           vertical: 'tab1' },
    { id: 'op3', name: 'FanDuel Sportsbook',      vertical: 'tab2' },
    { id: 'op4', name: 'DraftKings Sportsbook',   vertical: 'tab2' },
    { id: 'op5', name: 'BetMGM Sportsbook',       vertical: 'tab2' },
    { id: 'op6', name: 'Charitable Gaming Reg.',  vertical: 'tab3' },
  ],
  dataScale: {
    tab1_base_wager_volume:  1_800_000,
    tab2_base_wager_volume:  2_400_000,
    tab3_base_receipts:        420_000,
    patron_population:         300_000,
    active_exclusions:           5_000,
  },
  seasonLabel: 'Current Season (May–Oct)',
  seasonStart: '2025-05-01',
  seasonEnd:   '2025-10-31',
  stateWeights: [
    ['KY', 300], ['TN', 20], ['OH', 15], ['IN', 12], ['WV', 8],
    ['VA', 6],   ['FL', 4],  ['TX', 3],  ['CA', 2],  ['NY', 2],
  ],
}