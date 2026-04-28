// ═══════════════════════════════════════════════
// CORE UTILITIES
// ═══════════════════════════════════════════════

function deterministicVariance(dateStr, id, salt = 0) {
  let h = salt;
  for (const c of (dateStr + String(id))) h = (h * 31 + c.charCodeAt(0)) & 0xFFFFFFFF;
  return 0.88 + ((h >>> 0) % 240) / 1000;
}

function deterministicProb(dateStr, id, salt = 0) {
  let h = salt;
  for (const c of (dateStr + String(id))) h = (h * 31 + c.charCodeAt(0)) & 0xFFFFFFFF;
  return ((h >>> 0) % 1000) / 1000;
}

function weightedPick(items, weights, seed) {
  const total = weights.reduce((a, b) => a + b, 0);
  let h = seed;
  for (let i = 0; i < 3; i++) h = (h * 1664525 + 1013904223) & 0xFFFFFFFF;
  const r = (h >>> 0) % total;
  let cum = 0;
  for (let i = 0; i < items.length; i++) { cum += weights[i]; if (r < cum) return items[i]; }
  return items[items.length - 1];
}

// ═══════════════════════════════════════════════
// COMPUTED MATCH CONSTANTS (drive all Tab 4 numbers)
// ═══════════════════════════════════════════════

const LINKED_RATIO      = CONFIG.dataScale.linked_ratio  ?? 0.91;
const BREACH_RATE       = CONFIG.dataScale.breach_rate   ?? 0.25;
const TOTAL_MATCHED     = Math.round(CONFIG.dataScale.patron_population * LINKED_RATIO);
const ACTIVE_VIOLATIONS = Math.round(CONFIG.dataScale.active_exclusions * BREACH_RATE);

// Single-source counts sum exactly to (patron_population - TOTAL_MATCHED)
const UNLINKED              = CONFIG.dataScale.patron_population - TOTAL_MATCHED;
const ADW_ONLY_COUNT        = Math.round(UNLINKED * 0.45);
const SPORTS_ONLY_COUNT     = Math.round(UNLINKED * 0.31);
const CHARITABLE_ONLY_COUNT = UNLINKED - ADW_ONLY_COUNT - SPORTS_ONLY_COUNT;

// Venn overlap regions (must sum with single-source to patron_population)
const VENN_ALL_THREE         = Math.round(TOTAL_MATCHED * 0.55);
const VENN_ADW_SPORTS        = Math.round(TOTAL_MATCHED * 0.25);
const VENN_ADW_CHARITABLE    = Math.round(TOTAL_MATCHED * 0.12);
const VENN_SPORTS_CHARITABLE = TOTAL_MATCHED - VENN_ALL_THREE - VENN_ADW_SPORTS - VENN_ADW_CHARITABLE;
const VENN_ADW_TOTAL         = VENN_ALL_THREE + VENN_ADW_SPORTS + VENN_ADW_CHARITABLE + ADW_ONLY_COUNT;
const VENN_SPORTS_TOTAL      = VENN_ALL_THREE + VENN_ADW_SPORTS + VENN_SPORTS_CHARITABLE + SPORTS_ONLY_COUNT;
const VENN_CHARITABLE_TOTAL  = VENN_ALL_THREE + VENN_ADW_CHARITABLE + VENN_SPORTS_CHARITABLE + CHARITABLE_ONLY_COUNT;

// ═══════════════════════════════════════════════
// OPERATOR LISTS (filtered from CONFIG)
// ═══════════════════════════════════════════════

const PMU_OPS       = CONFIG.operators.filter(op => op.vertical === 'tab1');
const SPORTS_OPS    = CONFIG.operators.filter(op => op.vertical === 'tab2');
const CHAR_OPS      = CONFIG.operators.filter(op => op.vertical === 'tab3');
const STATE_NAMES   = CONFIG.stateWeights.map(sw => sw[0]);
const STATE_WTS     = CONFIG.stateWeights.map(sw => sw[1]);

// ═══════════════════════════════════════════════
// SEASONALITY — per vertical (12 monthly weights)
// ═══════════════════════════════════════════════

// Pari-mutuel: KY spring/fall peaks (Derby in May, Keeneland Oct, Breeders Cup Nov)
const SEASONALITY_PMU    = [0.45, 0.50, 0.65, 0.85, 1.00, 0.60, 0.45, 0.40, 0.75, 0.90, 0.70, 0.40];
// Sports: NFL-driven, peaks Sep-Jan
const SEASONALITY_SPORTS = [0.85, 0.50, 0.55, 0.40, 0.35, 0.30, 0.28, 0.42, 0.90, 1.00, 0.95, 0.80];
// Monthly event-distribution weight for charitable (used in event date selection)
const SEASONALITY_CHAR   = [6, 5, 7, 8, 9, 7, 5, 5, 8, 9, 10, 11];

// ═══════════════════════════════════════════════
// DAILY_PMU
// ═══════════════════════════════════════════════

const MARQUEE_PMU = [
  { id: 'P1', name: 'Kentucky Derby',         operator_id: 'op1', date: '2025-05-03', spike: 3.2 },
  { id: 'P2', name: 'Kentucky Oaks',           operator_id: 'op1', date: '2025-05-02', spike: 2.4 },
  { id: 'P3', name: 'Keeneland April Meet',    operator_id: 'op2', date: '2025-04-12', spike: 1.8 },
  { id: 'P4', name: 'Keeneland October Meet',  operator_id: 'op2', date: '2025-10-04', spike: 1.9 },
  { id: 'P5', name: "Breeders' Cup Day 1",     operator_id: 'op1', date: '2025-11-01', spike: 2.6 },
  { id: 'P6', name: "Breeders' Cup Day 2",     operator_id: 'op1', date: '2025-11-02', spike: 2.8 },
];
const MARQUEE_PMU_IDX = {};
MARQUEE_PMU.forEach(e => { MARQUEE_PMU_IDX[`${e.date}|${e.operator_id}`] = e; });

function generateDailyPMU() {
  const rows = [];
  const start = new Date('2025-01-01');
  const end   = new Date('2025-12-31');
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);
    const mo = d.getMonth();
    for (const op of PMU_OPS) {
      const season  = SEASONALITY_PMU[mo];
      const v       = deterministicVariance(dateStr, op.id, 1);
      const marquee = MARQUEE_PMU_IDX[`${dateStr}|${op.id}`];
      const spike   = marquee ? marquee.spike : 1;
      const wager_volume = Math.round(CONFIG.dataScale.tab1_base_wager_volume * season * v * spike);
      const mobile_share = 0.62 + deterministicVariance(dateStr, op.id, 2) * 0.1 - 0.05;
      rows.push({
        date:                    dateStr,
        operator_id:             op.id,
        operator_name:           op.name,
        wager_volume,
        wager_count:             Math.round(wager_volume / 48),
        deposits:                Math.round(wager_volume * 0.145),
        withdrawals:             Math.round(wager_volume * 0.076),
        mobile_wager:            Math.round(wager_volume * mobile_share),
        web_wager:               Math.round(wager_volume * (1 - mobile_share)),
        active_accounts:         Math.round(8000 * season * deterministicVariance(dateStr, op.id, 3)),
        new_registrations:       Math.round(25 * season * deterministicVariance(dateStr, op.id, 4)),
        suspended_accounts:      Math.round(120 * deterministicVariance(dateStr, op.id, 6)),
        high_velocity_accounts:  Math.round(800 * deterministicVariance(dateStr, op.id, 7)),
        is_marquee:              !!marquee,
        event_name:              marquee ? marquee.name : null,
      });
    }
  }
  return rows;
}

const DAILY_PMU = generateDailyPMU();
console.assert(DAILY_PMU.length === 365 * PMU_OPS.length,
  `DAILY_PMU count: expected ${365 * PMU_OPS.length}, got ${DAILY_PMU.length}`);
console.log('DAILY_PMU OK — total volume $' +
  (DAILY_PMU.reduce((s, r) => s + r.wager_volume, 0) / 1e9).toFixed(2) + 'B');

// ═══════════════════════════════════════════════
// DAILY_SPORTS
// ═══════════════════════════════════════════════

const MARQUEE_SPORTS = [
  { id: 'S1', name: 'NFL Opening Weekend',  date: '2025-09-07', spike: 2.8 },
  { id: 'S2', name: 'NFL Playoffs Round 1', date: '2026-01-18', spike: 2.4 },
  { id: 'S3', name: 'Super Bowl Sunday',    date: '2026-02-09', spike: 3.5 },
  { id: 'S4', name: 'March Madness Start',  date: '2025-03-20', spike: 1.9 },
  { id: 'S5', name: 'Kentucky Derby Week',  date: '2025-05-01', spike: 1.6 },
];
const MARQUEE_SPORTS_IDX = Object.fromEntries(MARQUEE_SPORTS.map(e => [e.date, e]));

function generateDailySports() {
  const rows = [];
  const start = new Date('2025-01-01');
  const end   = new Date('2025-12-31');
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);
    const mo = d.getMonth();
    for (const op of SPORTS_OPS) {
      const season = SEASONALITY_SPORTS[mo];
      const v      = deterministicVariance(dateStr, op.id, 10);
      const event  = MARQUEE_SPORTS_IDX[dateStr];
      const spike  = event ? event.spike : 1;
      const wager_volume  = Math.round(CONFIG.dataScale.tab2_base_wager_volume * season * v * spike);
      const pregame_share = 0.45 + deterministicVariance(dateStr, op.id, 11) * 0.08;
      const live_share    = 0.33 + deterministicVariance(dateStr, op.id, 12) * 0.06;
      const opSeed = op.id.charCodeAt(op.id.length - 1);
      const operator_compliance_score = parseFloat((1.2 + ((opSeed * 7) % 50) / 10).toFixed(1));
      rows.push({
        date:                       dateStr,
        operator_id:                op.id,
        operator_name:              op.name,
        wager_volume,
        wager_count:                Math.round(wager_volume / 55),
        pregame_volume:             Math.round(wager_volume * pregame_share),
        live_volume:                Math.round(wager_volume * live_share),
        parlay_volume:              Math.round(wager_volume * (1 - pregame_share - live_share)),
        active_accounts:            Math.round(12000 * season * deterministicVariance(dateStr, op.id, 13)),
        self_exclusion_flags:       Math.round(8 * deterministicVariance(dateStr, op.id, 14)),
        operator_compliance_score,
        unresolved_violations:      Math.round(15 * deterministicVariance(dateStr, op.id, 15)),
        is_marquee:                 !!event,
        event_name:                 event ? event.name : null,
      });
    }
  }
  return rows;
}

const DAILY_SPORTS = generateDailySports();
console.assert(DAILY_SPORTS.length === 365 * SPORTS_OPS.length,
  `DAILY_SPORTS count: expected ${365 * SPORTS_OPS.length}, got ${DAILY_SPORTS.length}`);
console.log('DAILY_SPORTS OK — total volume $' +
  (DAILY_SPORTS.reduce((s, r) => s + r.wager_volume, 0) / 1e9).toFixed(2) + 'B');

// ═══════════════════════════════════════════════
// EVENTS_CHARITABLE
// ═══════════════════════════════════════════════

const CHARITABLE_ORGS = CONFIG.tab3_orgs;
const EVENT_TYPES = ['bingo', 'raffle', 'casino_night'];
const CHAR_TOTAL_WEIGHT = SEASONALITY_CHAR.reduce((a, b) => a + b, 0);

// Verification rate trends upward across the calendar year (improving compliance narrative)
function getVerifRate(dateStr) {
  const mo = new Date(dateStr).getMonth();
  return 0.15 + mo * 0.018; // ~15% Jan, ~33% Dec
}

function generateEventsCharitable() {
  const events = [];
  let idx = 0;
  CHARITABLE_ORGS.forEach((orgName, orgIdx) => {
    const orgEventCount = 2 + (orgIdx % 3); // 2–4 events per org
    for (let i = 0; i < orgEventCount; i++, idx++) {
      const seed = idx * 6271 + orgIdx * 113;
      // Pick month by weighted distribution
      let r = seed % CHAR_TOTAL_WEIGHT, mo = 0, cum = 0;
      for (let m = 0; m < 12; m++) { cum += SEASONALITY_CHAR[m]; if (r < cum) { mo = m; break; } }
      const day     = 1 + (seed % 27);
      const dateStr = `2025-${String(mo + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const etype   = EVENT_TYPES[seed % 3];
      const baseRec = etype === 'casino_night' ? 12000 : etype === 'bingo' ? 4500 : 2800;
      const receipts = Math.round(baseRec * deterministicVariance(dateStr, orgIdx, 30));
      const attendee_count = Math.round(receipts / (etype === 'casino_night' ? 45 : 18));
      const verRate  = getVerifRate(dateStr);
      const identity_verification_flag = deterministicProb(dateStr, orgIdx, 31) < verRate;
      events.push({
        event_id:                    `CE-${String(idx + 1).padStart(4, '0')}`,
        org_name:                    orgName,
        org_id:                      `ORG-${String(orgIdx + 1).padStart(3, '0')}`,
        date:                        dateStr,
        event_type:                  etype,
        receipts,
        attendee_count,
        identity_verification_flag,
        exclusion_match_count:       identity_verification_flag && deterministicProb(dateStr, orgIdx, 32) < 0.08 ? 1 : 0,
        has_open_compliance_item:    deterministicProb(dateStr, orgIdx, 33) < 0.12,
      });
    }
  });
  return events.sort((a, b) => a.date.localeCompare(b.date));
}

const EVENTS_CHARITABLE = generateEventsCharitable();
console.assert(EVENTS_CHARITABLE.length > 90 && EVENTS_CHARITABLE.length < 170,
  `EVENTS_CHARITABLE count: ${EVENTS_CHARITABLE.length}`);
const verifiedCount = EVENTS_CHARITABLE.filter(e => e.identity_verification_flag).length;
console.log(`EVENTS_CHARITABLE OK — ${EVENTS_CHARITABLE.length} events, ${verifiedCount} verified (${(verifiedCount / EVENTS_CHARITABLE.length * 100).toFixed(1)}%)`);

// ═══════════════════════════════════════════════
// PATRONS sample (~1000 records for Tab 4 charts)
// ═══════════════════════════════════════════════

const PATRON_SEGMENTS = [
  { count: 420, verticals: ['ADW','SPORTS','CHARITABLE'], linked: true  },
  { count: 280, verticals: ['ADW','SPORTS'],              linked: true  },
  { count: 160, verticals: ['ADW','CHARITABLE'],          linked: true  },
  { count:  90, verticals: ['SPORTS','CHARITABLE'],       linked: true  },
  { count:  25, verticals: ['ADW'],                       linked: false },
  { count:  18, verticals: ['SPORTS'],                    linked: false },
  { count:  12, verticals: ['CHARITABLE'],                linked: false },
];
const EXCL_STATUSES = ['clean', 'monitored', 'flagged', 'excluded'];
const EXCL_WEIGHTS  = [88, 6, 3, 3];

function generatePatrons() {
  const patrons = [];
  let idx = 0;
  for (const seg of PATRON_SEGMENTS) {
    for (let i = 0; i < seg.count; i++, idx++) {
      const seed  = idx * 7919 + 42;
      const home_state    = weightedPick(STATE_NAMES, STATE_WTS, seed);
      const excl_status   = weightedPick(EXCL_STATUSES, EXCL_WEIGHTS, seed + 1);
      const isADW         = seg.verticals.includes('ADW');
      const isSports      = seg.verticals.includes('SPORTS');
      const isChar        = seg.verticals.includes('CHARITABLE');
      const adw_count     = isADW    ? 2 + (seed % 200) : null;
      const sports_count  = isSports ? 1 + (seed % 180) : null;
      const char_att      = isChar   ? 1 + (seed % 8)   : null;
      const total_freq    = (adw_count || 0) + (sports_count || 0) + (char_att || 0);
      const breach = excl_status === 'excluded' && seg.verticals.length > 1
        && deterministicVariance(String(seed), 'b', 50) < BREACH_RATE;
      const primary_op_pool = CONFIG.operators.filter(op =>
        (isADW    && op.vertical === 'tab1') ||
        (isSports && op.vertical === 'tab2') ||
        (isChar   && op.vertical === 'tab3')
      );
      const primary_op = primary_op_pool[seed % primary_op_pool.length];
      patrons.push({
        adw_patron_id:          isADW    ? `PMU-${String(idx+1).padStart(6,'0')}` : null,
        sports_patron_id:       isSports ? `SPT-${String(idx+1).padStart(6,'0')}` : null,
        charitable_patron_id:   isChar   ? `CHR-${String(idx+1).padStart(6,'0')}` : null,
        global_patron_id:       seg.linked ? `GBL-${String(idx+1).padStart(6,'0')}` : null,
        linked_verticals:       seg.verticals.join('|'),
        match_confidence_score: seg.linked ? 0.85 + (seed % 14) / 100 : null,
        exclusion_status:       excl_status,
        exclusion_source:       excl_status !== 'clean' ? (primary_op?.name ?? null) : null,
        exclusion_date:         excl_status !== 'clean'
          ? `2025-${String(1 + (seed % 11)).padStart(2,'0')}-${String(1+(seed%27)).padStart(2,'0')}`
          : null,
        breach_detected:        breach,
        breach_operator:        breach
          ? (CONFIG.operators.find(op => op.id !== primary_op?.id && op.vertical === 'tab2')?.name ?? null)
          : null,
        days_to_detection:      breach ? 4 + (seed % 72) : null,
        adw_wager_count:        adw_count,
        adw_wager_volume:       isADW    ? adw_count * (200 + (seed % 1800)) : null,
        adw_account_status:     isADW    ? ['active','active','active','suspended','excluded'][seed%5] : null,
        sports_wager_count:     sports_count,
        sports_wager_volume:    isSports ? sports_count * (55 + (seed % 300)) : null,
        sports_account_status:  isSports ? ['active','active','active','suspended','excluded'][seed%5] : null,
        charitable_events_attended: char_att,
        risk_tier:              excl_status,
        total_wager_frequency:  total_freq,
        verticals_active:       seg.verticals.length,
        home_state,
        primary_operator:       primary_op?.id ?? null,
      });
    }
  }
  return patrons;
}

const PATRONS = generatePatrons();
const linkedPatrons = PATRONS.filter(p => p.global_patron_id);
console.assert(linkedPatrons.length > 900, `Linked patron count: ${linkedPatrons.length}`);
const avgConf = linkedPatrons.reduce((s,p) => s + p.match_confidence_score, 0) / linkedPatrons.length;
console.assert(avgConf > 0.88 && avgConf < 0.99, `Avg confidence: ${avgConf}`);
console.log(`PATRONS OK — ${PATRONS.length} records, ${linkedPatrons.length} linked, avg conf ${(avgConf*100).toFixed(1)}%`);

// ═══════════════════════════════════════════════
// OPERATOR_EXCLUSION_FEEDS (drives Delta Sharing panel)
// ═══════════════════════════════════════════════

const VERTICAL_EXCL_SHARE = { tab1: 0.18, tab2: 0.65, tab3: 0.17 };

function generateOperatorExclusionFeeds() {
  return CONFIG.operators.map((op, i) => {
    const share   = VERTICAL_EXCL_SHARE[op.vertical] ?? 0.2;
    const opCount = CONFIG.operators.filter(o => o.vertical === op.vertical).length;
    const base    = Math.round(CONFIG.dataScale.active_exclusions * share / opCount);
    const count   = Math.round(base * deterministicVariance('feed', op.id, 40));
    const opSeed  = op.id.charCodeAt(op.id.length - 1);
    return {
      operator_id:         op.id,
      operator_name:       op.name,
      vertical:            op.vertical,
      exclusion_count:     count,
      last_sync_hours_ago: 1 + (i * 2 + 1),
      blocks_before_wager: Math.round(count * (0.60 + ((opSeed * 7) % 25) / 100)),
      detected_breaches:   Math.round(count * (0.05 + ((opSeed * 3) % 13) / 100)),
    };
  });
}

const OPERATOR_EXCLUSION_FEEDS = generateOperatorExclusionFeeds();
console.log(`OPERATOR_EXCLUSION_FEEDS OK — ${OPERATOR_EXCLUSION_FEEDS.length} operators, ` +
  OPERATOR_EXCLUSION_FEEDS.reduce((s, f) => s + f.exclusion_count, 0) + ' total records');
