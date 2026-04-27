// ═══════════════════════════════════════════════
// FILTER STATE
// ═══════════════════════════════════════════════

const STATE = {
  activeTab: 'tab1',
  tab1: { operator: 'all', dateRange: 'full_year', channel: 'all', accountStatus: 'all' },
  tab2: { operator: 'all', dateRange: 'full_year', wagerType: 'all', accountStatus: 'all' },
  tab3: { org: 'all', dateRange: 'full_year', verificationStatus: 'all', eventType: 'all' },
  tab4: { operator: 'all', dateRange: 'full_year', segment: 'all', exclusionStatus: 'all' },
};

const DATE_PRESETS = {
  last_30:        () => { const e = new Date('2025-12-31'); const s = new Date(e); s.setDate(s.getDate()-30); return [s,e]; },
  last_90:        () => { const e = new Date('2025-12-31'); const s = new Date(e); s.setDate(s.getDate()-90); return [s,e]; },
  current_season: () => [new Date(CONFIG.seasonStart), new Date(CONFIG.seasonEnd)],
  full_year:      () => [new Date('2025-01-01'), new Date('2025-12-31')],
};

function getDateWindow(filters) {
  if (filters.dateRange === 'custom' && filters.customStart && filters.customEnd) {
    return [new Date(filters.customStart), new Date(filters.customEnd)];
  }
  return (DATE_PRESETS[filters.dateRange] || DATE_PRESETS.full_year)();
}

function filterDaily(dailyArr, filters) {
  const [start, end] = getDateWindow(filters);
  return dailyArr.filter(r => {
    const d = new Date(r.date);
    if (d < start || d > end) return false;
    if (filters.operator !== 'all' && r.operator_id !== filters.operator) return false;
    return true;
  });
}

function filterEvents(eventsArr, filters) {
  const [start, end] = getDateWindow(filters);
  return eventsArr.filter(r => {
    const d = new Date(r.date);
    if (d < start || d > end) return false;
    if (filters.org !== 'all' && r.org_name !== filters.org) return false;
    if (filters.eventType !== 'all' && r.event_type !== filters.eventType) return false;
    if (filters.verificationStatus === 'verified'     && !r.identity_verification_flag) return false;
    if (filters.verificationStatus === 'not_verified' &&  r.identity_verification_flag) return false;
    return true;
  });
}

function filterPatrons(filters) {
  return PATRONS.filter(p => {
    if (filters.operator !== 'all' && p.primary_operator !== filters.operator) return false;
    if (filters.exclusionStatus === 'excluded_only'    && p.exclusion_status !== 'excluded') return false;
    if (filters.exclusionStatus === 'active_violations' && !p.breach_detected) return false;
    if (filters.segment === 'top_decile'      && p.total_wager_frequency < getTopDecileThreshold()) return false;
    if (filters.segment === 'single_source'   && p.global_patron_id)  return false;
    if (filters.segment === 'exclusion_flagged' && !['flagged','excluded'].includes(p.exclusion_status)) return false;
    return true;
  });
}

function getTopDecileThreshold() {
  const sorted = [...PATRONS].sort((a,b) => b.total_wager_frequency - a.total_wager_frequency);
  return sorted[Math.floor(sorted.length * 0.10)]?.total_wager_frequency ?? 0;
}

const fmt = {
  currency: n => '$' + (n >= 1_000_000 ? (n/1_000_000).toFixed(1)+'M' : n >= 1000 ? (n/1000).toFixed(0)+'K' : n.toFixed(0)),
  pct:      n => (n * 100).toFixed(1) + '%',
  num:      n => n >= 1_000_000 ? (n/1_000_000).toFixed(1)+'M' : n >= 1000 ? (n/1000).toFixed(1)+'K' : String(Math.round(n)),
  delta:    (curr, prev) => {
    if (!prev) return '';
    const pct = ((curr - prev) / prev * 100).toFixed(1);
    return (curr >= prev ? '▲ ' : '▼ ') + Math.abs(pct) + '% vs prior period';
  },
};

// Smoke tests
console.assert(filterDaily(DAILY_PMU, STATE.tab1).length === 365 * PMU_OPS.length, 'filterDaily full_year');
console.assert(filterEvents(EVENTS_CHARITABLE, STATE.tab3).length === EVENTS_CHARITABLE.length, 'filterEvents full_year');
console.assert(filterPatrons(STATE.tab4).length === PATRONS.length, 'filterPatrons default');
console.log('FILTERS OK');
