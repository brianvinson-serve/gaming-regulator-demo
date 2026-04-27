// ═══════════════════════════════════════════════
// CHART REGISTRY + DEFAULTS
// ═══════════════════════════════════════════════

const CHARTS = {};

function destroyChart(id) {
  if (CHARTS[id]) { CHARTS[id].destroy(); delete CHARTS[id]; }
}

Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
Chart.defaults.font.size   = 12;
Chart.defaults.color       = '#6B7280';

const PALETTE = {
  navy:   '#1B2A4A',
  blue:   '#2E618F',
  slate:  '#5B7FA6',
  teal:   '#00A896',
  teal2:  '#48CAB2',
  coral:  '#D85F52',
  amber:  '#D97706',
  gray:   '#8B96A5',
  gray2:  '#C5CBD4',
};

const EXCL_COLORS = {
  clean:     PALETTE.blue,
  monitored: PALETTE.gray,
  flagged:   PALETTE.amber,
  excluded:  PALETTE.coral,
};

// ═══════════════════════════════════════════════
// CHOROPLETH HELPER (uses bundled US_TOPOLOGY)
// ═══════════════════════════════════════════════

function renderChoropleth(svgId, patronsByState) {
  const svg  = d3.select('#' + svgId);
  svg.selectAll('*').remove();
  const w = svg.node().getBoundingClientRect().width  || 700;
  const h = svg.node().getBoundingClientRect().height || 300;
  svg.attr('width', w).attr('height', h);

  const statesGeo = topojson.feature(US_TOPOLOGY, US_TOPOLOGY.objects.states);
  const projection = d3.geoAlbersUsa().fitSize([w, h], statesGeo);
  const path = d3.geoPath().projection(projection);

  const maxVal = Math.max(1, ...Object.values(patronsByState));
  const colorScale = d3.scaleSequential()
    .domain([0, maxVal])
    .interpolator(d3.interpolate('#E8F0F8', PALETTE.navy));

  const FIPS_ABBREV = {
    '01':'AL','02':'AK','04':'AZ','05':'AR','06':'CA','08':'CO','09':'CT',
    '10':'DE','12':'FL','13':'GA','16':'ID','17':'IL','18':'IN','19':'IA',
    '20':'KS','21':'KY','22':'LA','23':'ME','24':'MD','25':'MA','26':'MI',
    '27':'MN','28':'MS','29':'MO','30':'MT','31':'NE','32':'NV','33':'NH',
    '34':'NJ','35':'NM','36':'NY','37':'NC','38':'ND','39':'OH','40':'OK',
    '41':'OR','42':'PA','44':'RI','45':'SC','46':'SD','47':'TN','48':'TX',
    '49':'UT','50':'VT','51':'VA','53':'WA','54':'WV','55':'WI','56':'WY',
  };

  svg.selectAll('path')
    .data(statesGeo.features)
    .enter().append('path')
      .attr('d', path)
      .attr('fill', d => {
        const abbrev = FIPS_ABBREV[String(d.id).padStart(2,'0')];
        return colorScale(patronsByState[abbrev] || 0);
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.5)
    .append('title')
      .text(d => {
        const abbrev = FIPS_ABBREV[String(d.id).padStart(2,'0')] || '?';
        const count  = patronsByState[abbrev] || 0;
        return `${abbrev}: ${count.toLocaleString()} patrons`;
      });
}

function buildPatronsByState(patronArr) {
  const map = {};
  patronArr.forEach(p => {
    if (p.home_state) map[p.home_state] = (map[p.home_state] || 0) + 1;
  });
  return map;
}

// ═══════════════════════════════════════════════
// TAB 1 — PARI-MUTUEL / ADW
// ═══════════════════════════════════════════════

function renderTab1() {
  const f     = STATE.tab1;
  const daily = filterDaily(DAILY_PMU, f);

  const totalVolume  = daily.reduce((s,r) => s + r.wager_volume, 0);
  const totalDeposits = daily.reduce((s,r) => s + r.deposits, 0);
  const totalWithdrawals = daily.reduce((s,r) => s + r.withdrawals, 0);
  const activeAccounts   = daily.length ? Math.max(...daily.map(r => r.active_accounts)) : 0;
  const newRegs          = daily.reduce((s,r) => s + r.new_registrations, 0);
  const suspended        = daily.length ? Math.max(...daily.map(r => r.suspended_accounts)) : 0;
  const highVelocity     = daily.length ? Math.max(...daily.map(r => r.high_velocity_accounts)) : 0;
  const mobileVol        = daily.reduce((s,r) => s + r.mobile_wager, 0);
  const mobileShare      = totalVolume > 0 ? mobileVol / totalVolume : 0;

  // Prior period delta for total volume
  const [wStart, wEnd] = getDateWindow(f);
  const windowDays = Math.round((wEnd - wStart) / 86400000);
  const priorEnd   = new Date(wStart); priorEnd.setDate(priorEnd.getDate() - 1);
  const priorStart = new Date(priorEnd); priorStart.setDate(priorEnd.getDate() - windowDays);
  const priorDaily = filterDaily(DAILY_PMU, { ...f, dateRange:'custom',
    customStart: priorStart.toISOString().slice(0,10), customEnd: priorEnd.toISOString().slice(0,10) });
  const priorVolume = priorDaily.reduce((s,r) => s + r.wager_volume, 0);

  renderBANs('t1-bans', [
    { label: 'Total Wager Volume',     value: fmt.currency(totalVolume), delta: fmt.delta(totalVolume, priorVolume),
      tooltip: 'Total dollar volume wagered across all pari-mutuel and ADW operators in the selected period.' },
    { label: 'Active Accounts (peak)', value: fmt.num(activeAccounts),
      tooltip: 'Peak single-day active account count in the period. An account is active if it placed at least one wager on that day.' },
    { label: 'New Registrations',      value: fmt.num(newRegs),
      tooltip: 'New patron accounts opened in the period across all licensed ADW operators.' },
    { label: 'Suspended / Flagged',    value: fmt.num(suspended),
      tooltip: 'Accounts currently in a suspended or compliance-flagged state. Suspension reasons include self-exclusion violations, fraud flags, and operator-initiated holds.' },
    { label: 'High-Velocity Accounts', value: fmt.num(highVelocity),
      tooltip: 'Accounts in the top 10% of wager frequency for this period. High frequency alone does not indicate a problem — but these accounts are the first priority for cross-vertical identity checks. An excluded patron who reregisters under a variant identity will often appear here first.' },
    { label: 'Mobile Share',           value: fmt.pct(mobileShare),
      tooltip: 'Share of total wager volume placed via mobile app vs. web browser. Mobile-dominant operators require mobile-specific enforcement protocols for self-exclusion.' },
  ]);

  // Chart 1: Wager Volume by Day (line)
  destroyChart('t1-volumeByDay');
  const dayLabels = [...new Set(daily.map(r => r.date))].sort();
  const dayData   = dayLabels.map(dt => daily.filter(r => r.date === dt).reduce((s,r) => s + r.wager_volume, 0));
  CHARTS['t1-volumeByDay'] = new Chart(document.getElementById('t1-volumeByDay'), {
    type: 'line',
    data: { labels: dayLabels, datasets: [{
      label: 'Wager Volume', data: dayData,
      borderColor: PALETTE.teal, backgroundColor: 'rgba(0,168,150,.08)',
      fill: true, pointRadius: 0, borderWidth: 2, tension: 0.3,
    }]},
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { maxTicksLimit: 12, callback: (v) => dayLabels[v]?.slice(5) }, grid: { display: false } },
        y: { ticks: { callback: v => fmt.currency(v) } },
      },
    },
  });

  // Chart 2: Marquee Days vs. Prior Year (grouped bar)
  destroyChart('t1-marqueeBar');
  const marqueeRows = DAILY_PMU.filter(r => r.is_marquee);
  const marqueeNames = [...new Set(marqueeRows.map(r => r.event_name))];
  const currentVol = marqueeNames.map(n => marqueeRows.filter(r => r.event_name === n).reduce((s,r) => s + r.wager_volume, 0));
  const priorVol   = currentVol.map(v => Math.round(v * (0.82 + Math.random() * 0.1))); // synthetic prior year
  CHARTS['t1-marqueeBar'] = new Chart(document.getElementById('t1-marqueeBar'), {
    type: 'bar',
    data: { labels: marqueeNames, datasets: [
      { label: 'Current Year',  data: currentVol, backgroundColor: PALETTE.navy, borderRadius: 3 },
      { label: 'Prior Year',    data: priorVol,   backgroundColor: PALETTE.gray2, borderRadius: 3 },
    ]},
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } },
      scales: { y: { ticks: { callback: v => fmt.currency(v) } } },
    },
  });

  // Chart 3: Deposits vs. Withdrawals by Day (line, dual series)
  destroyChart('t1-depWithDay');
  const depByDay  = dayLabels.map(dt => daily.filter(r => r.date === dt).reduce((s,r) => s + r.deposits, 0));
  const withByDay = dayLabels.map(dt => daily.filter(r => r.date === dt).reduce((s,r) => s + r.withdrawals, 0));
  CHARTS['t1-depWithDay'] = new Chart(document.getElementById('t1-depWithDay'), {
    type: 'line',
    data: { labels: dayLabels, datasets: [
      { label: 'Deposits',     data: depByDay,  borderColor: PALETTE.teal,  backgroundColor: 'transparent', pointRadius: 0, borderWidth: 2, tension: 0.3 },
      { label: 'Withdrawals',  data: withByDay, borderColor: PALETTE.coral, backgroundColor: 'transparent', pointRadius: 0, borderWidth: 2, tension: 0.3 },
    ]},
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } },
      scales: {
        x: { ticks: { maxTicksLimit: 12, callback: v => dayLabels[v]?.slice(5) }, grid: { display: false } },
        y: { ticks: { callback: v => fmt.currency(v) } },
      },
    },
  });

  // Chart 4: Mobile vs. Web Split (donut)
  destroyChart('t1-channelDonut');
  const webVol = daily.reduce((s,r) => s + r.web_wager, 0);
  CHARTS['t1-channelDonut'] = new Chart(document.getElementById('t1-channelDonut'), {
    type: 'doughnut',
    data: { labels: ['Mobile App', 'Web'], datasets: [{ data: [mobileVol, webVol],
      backgroundColor: [PALETTE.navy, PALETTE.slate], borderWidth: 0 }]},
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' },
        tooltip: { callbacks: { label: ctx => `${ctx.label}: ${fmt.pct(ctx.parsed / (mobileVol + webVol))}` } } },
      cutout: '62%',
    },
  });

  // Chart 5: Wager Volume by State — Top 10 (horizontal bar)
  destroyChart('t1-stateBar');
  const stateData = CONFIG.stateWeights.map(([st, wt]) => ({ state: st, vol: Math.round(totalVolume * wt / CONFIG.stateWeights.reduce((s,[,w]) => s+w, 0)) }))
    .sort((a,b) => b.vol - a.vol).slice(0, 10);
  CHARTS['t1-stateBar'] = new Chart(document.getElementById('t1-stateBar'), {
    type: 'bar',
    data: { labels: stateData.map(s => s.state), datasets: [{ label: 'Volume', data: stateData.map(s => s.vol), backgroundColor: PALETTE.blue, borderRadius: 3 }]},
    options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { ticks: { callback: v => fmt.currency(v) } }, y: { grid: { display: false } } },
    },
  });

  // Chart 6: Choropleth
  const patronsByState = buildPatronsByState(PATRONS.filter(p => p.adw_patron_id));
  renderChoropleth('t1-choropleth', patronsByState);
}

// ═══════════════════════════════════════════════
// TAB 2 — SPORTS WAGERING
// ═══════════════════════════════════════════════

function renderTab2() {
  const f     = STATE.tab2;
  const daily = filterDaily(DAILY_SPORTS, f);

  const totalVolume      = daily.reduce((s,r) => s + r.wager_volume, 0);
  const activeLicensed   = SPORTS_OPS.length;
  const exclFlags        = daily.reduce((s,r) => s + r.self_exclusion_flags, 0);
  const crossOpRepeats   = PATRONS.filter(p => p.sports_patron_id && p.verticals_active > 1).length;
  const avgComplianceDays = SPORTS_OPS.length
    ? OPERATOR_EXCLUSION_FEEDS.filter(f => f.vertical === 'tab2')
        .reduce((s,f) => {
          const opSeed = f.operator_id.charCodeAt(f.operator_id.length - 1);
          return s + parseFloat((1.2 + ((opSeed * 7) % 50) / 10).toFixed(1));
        }, 0) / SPORTS_OPS.length
    : 0;
  const unresolvedViol   = daily.reduce((s,r) => s + r.unresolved_violations, 0);

  renderBANs('t2-bans', [
    { label: 'Total Sports Wager Volume',  value: fmt.currency(totalVolume),
      tooltip: 'Total dollar volume wagered across all licensed sportsbook operators in the selected period.' },
    { label: 'Active Licensed Operators',  value: String(activeLicensed),
      tooltip: 'Number of licensed sportsbook operators currently active in the state.' },
    { label: 'Self-Exclusion Flags',       value: fmt.num(exclFlags),
      tooltip: 'Wager attempts made by patrons whose account is currently flagged as self-excluded. These are within-operator flags only. Cross-operator breaches require identity resolution — see Patron Identity tab.' },
    { label: 'Cross-Operator Repeat Regs', value: fmt.num(crossOpRepeats),
      tooltip: 'Patrons detected as active at two or more licensed sportsbook operators simultaneously. May indicate re-registration after self-exclusion or duplicate account creation.' },
    { label: 'Operator Compliance Score',  value: avgComplianceDays.toFixed(1) + 'd avg',
      tooltip: 'Average days from exclusion notification to confirmed operator action. Lower is better. Individual operator scores visible in the chart below.' },
    { label: 'Unresolved Exclusion Violations', value: fmt.num(unresolvedViol),
      tooltip: 'Flagged wager attempts from excluded patrons that have not yet been actioned by the receiving operator.' },
  ]);

  // Chart 1: Wager Volume by Day (line)
  destroyChart('t2-volumeByDay');
  const dayLabels = [...new Set(daily.map(r => r.date))].sort();
  const dayData   = dayLabels.map(dt => daily.filter(r => r.date === dt).reduce((s,r) => s + r.wager_volume, 0));
  CHARTS['t2-volumeByDay'] = new Chart(document.getElementById('t2-volumeByDay'), {
    type: 'line',
    data: { labels: dayLabels, datasets: [{
      label: 'Wager Volume', data: dayData,
      borderColor: PALETTE.teal, backgroundColor: 'rgba(0,168,150,.08)',
      fill: true, pointRadius: 0, borderWidth: 2, tension: 0.3,
    }]},
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { maxTicksLimit: 12, callback: v => dayLabels[v]?.slice(5) }, grid: { display: false } },
        y: { ticks: { callback: v => fmt.currency(v) } },
      },
    },
  });

  // Chart 2: Volume by Operator (grouped bar)
  destroyChart('t2-operatorBar');
  const opVolume = SPORTS_OPS.map(op => ({
    name: op.name,
    vol:  daily.filter(r => r.operator_id === op.id).reduce((s,r) => s + r.wager_volume, 0),
  }));
  CHARTS['t2-operatorBar'] = new Chart(document.getElementById('t2-operatorBar'), {
    type: 'bar',
    data: { labels: opVolume.map(o => o.name), datasets: [{
      label: 'Wager Volume', data: opVolume.map(o => o.vol),
      backgroundColor: [PALETTE.navy, PALETTE.blue, PALETTE.slate, PALETTE.teal, PALETTE.gray].slice(0, SPORTS_OPS.length),
      borderRadius: 3,
    }]},
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { ticks: { callback: v => fmt.currency(v) } } },
    },
  });

  // Chart 3: Wager Type Mix by Month (stacked bar)
  destroyChart('t2-wagerTypeMix');
  const months = [...new Set(daily.map(r => r.date.slice(0,7)))].sort();
  CHARTS['t2-wagerTypeMix'] = new Chart(document.getElementById('t2-wagerTypeMix'), {
    type: 'bar',
    data: { labels: months, datasets: [
      { label: 'Pre-Game', data: months.map(m => daily.filter(r => r.date.startsWith(m)).reduce((s,r) => s + r.pregame_volume, 0)), backgroundColor: PALETTE.navy, stack: 'wt' },
      { label: 'Live',     data: months.map(m => daily.filter(r => r.date.startsWith(m)).reduce((s,r) => s + r.live_volume, 0)),    backgroundColor: PALETTE.blue,  stack: 'wt' },
      { label: 'Parlay',   data: months.map(m => daily.filter(r => r.date.startsWith(m)).reduce((s,r) => s + r.parlay_volume, 0)), backgroundColor: PALETTE.slate, stack: 'wt' },
    ]},
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } },
      scales: { x: { stacked: true }, y: { stacked: true, ticks: { callback: v => fmt.currency(v) } } },
    },
  });

  // Chart 4: Self-Exclusion Match Rate by Operator (horizontal bar)
  destroyChart('t2-exclusionByOp');
  const opExclData = SPORTS_OPS.map(op => {
    const rows = DAILY_SPORTS.filter(r => r.operator_id === op.id);
    const flags = rows.reduce((s,r) => s + r.self_exclusion_flags, 0);
    const acts  = rows.reduce((s,r) => s + r.active_accounts, 0) || 1;
    return { name: op.name, rate: flags / (acts / 365) };
  }).sort((a,b) => b.rate - a.rate);
  CHARTS['t2-exclusionByOp'] = new Chart(document.getElementById('t2-exclusionByOp'), {
    type: 'bar',
    data: { labels: opExclData.map(o => o.name), datasets: [{
      label: 'Exclusion Flags per 1K Active Accounts',
      data: opExclData.map(o => parseFloat((o.rate * 1000).toFixed(2))),
      backgroundColor: PALETTE.coral, borderRadius: 3,
    }]},
    options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { grid: { display: false } }, y: { grid: { display: false } } },
    },
  });

  // Chart 5: Choropleth
  renderChoropleth('t2-choropleth', buildPatronsByState(PATRONS.filter(p => p.sports_patron_id)));
}

// ═══════════════════════════════════════════════
// TAB 3 — CHARITABLE GAMING (event-level)
// ═══════════════════════════════════════════════

function renderTab3() {
  const f      = STATE.tab3;
  const events = filterEvents(EVENTS_CHARITABLE, f);

  const licensedOrgs    = [...new Set(EVENTS_CHARITABLE.map(e => e.org_name))].length;
  const eventCount      = events.length;
  const verifiedEvents  = events.filter(e => e.identity_verification_flag).length;
  const verifPct        = eventCount > 0 ? verifiedEvents / eventCount : 0;
  const totalReceipts   = events.reduce((s,e) => s + e.receipts, 0);
  const exclMatchCount  = events.reduce((s,e) => s + e.exclusion_match_count, 0);
  const exclMatchRate   = verifiedEvents > 0 ? exclMatchCount / verifiedEvents : 0;
  const openCompliance  = events.filter(e => e.has_open_compliance_item).length;

  renderBANs('t3-bans', [
    { label: 'Licensed Organizations', value: String(licensedOrgs),
      tooltip: 'Total active charitable gaming organizations licensed in the state. Each must file an event report for every licensed event.' },
    { label: 'Events This Period',     value: String(eventCount),
      tooltip: 'Count of licensed charitable gaming events in the selected date range. Event-level reporting (not daily) is how charitable gaming data arrives to regulators.' },
    { label: 'Events with ID Verification', value: fmt.pct(verifPct),
      tooltip: 'Share of events where the operator ran attendee identity against any exclusion list. The statewide average is typically under 30%. Without identity resolution, a self-excluded patron can attend any event at an organization that does not check — and even when checked, the check only covers the operator\'s own list.' },
    { label: 'Total Receipts Under Oversight', value: fmt.currency(totalReceipts),
      tooltip: 'Gross receipts from all charitable gaming events in the period. Charitable gaming is often the least-monitored regulated vertical despite significant aggregate revenue.' },
    { label: 'Self-Exclusion Match Rate', value: fmt.pct(exclMatchRate),
      tooltip: 'Among events that ran identity verification, the share that caught at least one patron on an active exclusion list. The low absolute rate reflects both low verification coverage and limited cross-operator list sharing.' },
    { label: 'Open Compliance Items', value: String(openCompliance),
      tooltip: 'Organizations with at least one unresolved compliance item in the period — missing event reports, late filings, or flagged receipts.' },
  ]);

  // Chart 1: Events per Month with Verification Rate overlay (bar + line combo)
  destroyChart('t3-eventsVerifRate');
  const months = ['2025-01','2025-02','2025-03','2025-04','2025-05','2025-06',
                  '2025-07','2025-08','2025-09','2025-10','2025-11','2025-12'];
  const eventsByMo  = months.map(m => EVENTS_CHARITABLE.filter(e => e.date.startsWith(m)).length);
  const verifByMo   = months.map(m => {
    const moEvts     = EVENTS_CHARITABLE.filter(e => e.date.startsWith(m));
    const moVerified = moEvts.filter(e => e.identity_verification_flag).length;
    return moEvts.length > 0 ? moVerified / moEvts.length : 0;
  });
  CHARTS['t3-eventsVerifRate'] = new Chart(document.getElementById('t3-eventsVerifRate'), {
    type: 'bar',
    data: { labels: months.map(m => m.slice(5)),
      datasets: [
        { label: 'Events',             data: eventsByMo, backgroundColor: PALETTE.navy, borderRadius: 3, yAxisID: 'y' },
        { label: 'Verification Rate',  data: verifByMo,  type: 'line', borderColor: PALETTE.teal,
          backgroundColor: 'transparent', pointRadius: 3, borderWidth: 2, yAxisID: 'y1' },
      ],
    },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } },
      scales: {
        y:  { type: 'linear', position: 'left',  title: { display: true, text: 'Events' } },
        y1: { type: 'linear', position: 'right', min: 0, max: 1,
              ticks: { callback: v => fmt.pct(v) }, grid: { drawOnChartArea: false } },
      },
    },
  });

  // Chart 2: Receipts by Organization — Top 10 (horizontal bar)
  destroyChart('t3-receiptsByOrg');
  const orgReceipts = [...new Set(EVENTS_CHARITABLE.map(e => e.org_name))]
    .map(org => ({ org, total: EVENTS_CHARITABLE.filter(e => e.org_name === org).reduce((s,e) => s + e.receipts, 0) }))
    .sort((a,b) => b.total - a.total).slice(0, 10);
  CHARTS['t3-receiptsByOrg'] = new Chart(document.getElementById('t3-receiptsByOrg'), {
    type: 'bar',
    data: { labels: orgReceipts.map(o => o.org), datasets: [{
      label: 'Receipts', data: orgReceipts.map(o => o.total), backgroundColor: PALETTE.blue, borderRadius: 3,
    }]},
    options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { ticks: { callback: v => fmt.currency(v) } }, y: { grid: { display: false } } },
    },
  });

  // Chart 3: Event Type Mix (donut)
  destroyChart('t3-eventTypeMix');
  const typeCounts = { bingo: 0, raffle: 0, casino_night: 0 };
  events.forEach(e => { typeCounts[e.event_type] = (typeCounts[e.event_type] || 0) + 1; });
  CHARTS['t3-eventTypeMix'] = new Chart(document.getElementById('t3-eventTypeMix'), {
    type: 'doughnut',
    data: { labels: ['Bingo', 'Raffle', 'Casino Night'],
      datasets: [{ data: [typeCounts.bingo, typeCounts.raffle, typeCounts.casino_night],
        backgroundColor: [PALETTE.navy, PALETTE.blue, PALETTE.teal], borderWidth: 0 }],
    },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } }, cutout: '55%',
    },
  });

  // Chart 4: Verification Rate by Event Type (grouped bar)
  destroyChart('t3-verifByType');
  const typeVerif = ['bingo','raffle','casino_night'].map(t => {
    const te = EVENTS_CHARITABLE.filter(e => e.event_type === t);
    return te.length > 0 ? te.filter(e => e.identity_verification_flag).length / te.length : 0;
  });
  CHARTS['t3-verifByType'] = new Chart(document.getElementById('t3-verifByType'), {
    type: 'bar',
    data: { labels: ['Bingo', 'Raffle', 'Casino Night'],
      datasets: [{ label: 'Verification Rate', data: typeVerif,
        backgroundColor: [PALETTE.navy, PALETTE.blue, PALETTE.teal], borderRadius: 3 }],
    },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { min: 0, max: 1, ticks: { callback: v => fmt.pct(v) } } },
    },
  });

  // Chart 5: Identity Check Coverage Trend (line)
  destroyChart('t3-verifTrend');
  CHARTS['t3-verifTrend'] = new Chart(document.getElementById('t3-verifTrend'), {
    type: 'line',
    data: { labels: months.map(m => m.slice(5)), datasets: [{
      label: 'Verification Rate', data: verifByMo,
      borderColor: PALETTE.teal, backgroundColor: 'rgba(0,168,150,.08)',
      fill: true, pointRadius: 3, borderWidth: 2,
    }]},
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { min: 0, max: 1, ticks: { callback: v => fmt.pct(v) } }, x: { grid: { display: false } } },
    },
  });
}

// ═══════════════════════════════════════════════
// TAB 4 — PATRON IDENTITY RESOLUTION
// ═══════════════════════════════════════════════

function renderMatchBanner() {
  const t1 = CONFIG.tabs.tab1.label;
  const t2 = CONFIG.tabs.tab2.label;
  const t3 = CONFIG.tabs.tab3.label;
  document.getElementById('t4-match-banner').innerHTML = `
    <div class="match-banner-sub">P3RL Identity Resolution — Statewide Patron Match</div>
    <div class="match-banner-headline">${fmt.num(TOTAL_MATCHED)} patrons resolved across ${t1}, ${t2}, and ${t3}</div>
    <div class="match-banner-stats">
      <span>Match confidence: <strong>91%</strong></span>
      <span>${t1}-only: <strong>${fmt.num(ADW_ONLY_COUNT)}</strong></span>
      <span>${t2}-only: <strong>${fmt.num(SPORTS_ONLY_COUNT)}</strong></span>
      <span>${t3}-only: <strong>${fmt.num(CHARITABLE_ONLY_COUNT)}</strong></span>
      <span class="match-violation">Active exclusion violations detected: <strong>${fmt.num(ACTIVE_VIOLATIONS)}</strong></span>
    </div>
  `;
}

function renderDeltaFeedPanel() {
  const resolvedUnique = Math.round(CONFIG.dataScale.active_exclusions * 2.1);
  const rows = OPERATOR_EXCLUSION_FEEDS.map(f => `
    <div class="feed-name">${f.operator_name}</div>
    <div class="feed-count">${fmt.num(f.exclusion_count)} records</div>
    <div class="feed-sync">Synced ${f.last_sync_hours_ago}h ago</div>
    <div class="feed-check">&#10003;</div>
  `).join('');
  document.getElementById('t4-delta-feed').innerHTML = `
    <div class="delta-feed-label">Exclusion Lists Ingested via Databricks Delta Sharing</div>
    <div class="delta-feed-rows">${rows}</div>
    <div class="delta-feed-summary">
      P3RL resolved <strong>${fmt.num(resolvedUnique)} unique patrons</strong> across all ${OPERATOR_EXCLUSION_FEEDS.length} operator lists
      &nbsp;&rarr;&nbsp;
      <strong class="match-violation">${fmt.num(ACTIVE_VIOLATIONS)} confirmed cross-operator breach attempts detected</strong>
    </div>
  `;
}

function renderTab4() {
  renderMatchBanner();
  renderDeltaFeedPanel();

  const f       = STATE.tab4;
  const patrons = filterPatrons(f);
  const threshold = getTopDecileThreshold();

  // BANs
  const highActivityUnexcluded = Math.round(CONFIG.dataScale.patron_population * 0.028);
  const notifQueue = Math.round(ACTIVE_VIOLATIONS * 0.25);
  renderBANs('t4-bans', [
    { label: 'Total Patrons Matched', value: fmt.num(TOTAL_MATCHED), lead: true,
      tooltip: 'Unique patron records resolved across two or more regulated verticals by P3RL. A patron active in ADW and sports wagering under different identifiers is counted once here.' },
    { label: 'Active Exclusions',     value: fmt.num(CONFIG.dataScale.active_exclusions),
      tooltip: 'Total active self-exclusion entries across all licensed operators in the state. Before identity resolution, these lists exist separately at each operator and are not cross-checked.' },
    { label: 'Cross-Vertical Breach Rate', value: fmt.pct(BREACH_RATE),
      tooltip: 'Share of active exclusions where the excluded patron has been detected wagering at a different operator than where they self-excluded. This is only detectable through cross-vertical identity resolution.' },
    { label: 'Avg Time to Detection', value: '18.4h',
      tooltip: 'Average time from a patron\'s exclusion event to detection of their first wager attempt on another platform. Reducing this is the operational goal of real-time Delta Sharing ingestion.' },
    { label: 'High-Activity Unexcluded', value: fmt.num(highActivityUnexcluded),
      tooltip: 'Patrons in the top decile of wager frequency with no exclusion on file. Proactive monitoring candidates — problem gambling patterns often precede self-exclusion requests by weeks or months.' },
    { label: 'Operator Notification Queue', value: fmt.num(notifQueue),
      tooltip: 'Exclusion violations flagged by P3RL that have been sent to the responsible operator but not yet confirmed as actioned. A growing queue indicates slow operator response.' },
  ]);

  // Chart 1: Patron Population Overlap — Venn Diagram
  destroyChart('t4-venn');
  const t1Label = CONFIG.tabs.tab1.label;
  const t2Label = CONFIG.tabs.tab2.label;
  const t3Label = CONFIG.tabs.tab3.label;
  CHARTS['t4-venn'] = new Chart(document.getElementById('t4-venn'), {
    type: 'venn',
    data: {
      labels: [t1Label, t2Label, t3Label],
      datasets: [{
        label: 'Patron Coverage',
        data: [
          { sets: [t1Label],              value: VENN_ADW_TOTAL },
          { sets: [t2Label],              value: VENN_SPORTS_TOTAL },
          { sets: [t3Label],              value: VENN_CHARITABLE_TOTAL },
          { sets: [t1Label, t2Label],     value: VENN_ADW_SPORTS },
          { sets: [t1Label, t3Label],     value: VENN_ADW_CHARITABLE },
          { sets: [t2Label, t3Label],     value: VENN_SPORTS_CHARITABLE },
          { sets: [t1Label, t2Label, t3Label], value: VENN_ALL_THREE },
        ],
        backgroundColor: [
          'rgba(27,42,74,0.58)',
          'rgba(46,97,143,0.58)',
          'rgba(0,168,150,0.62)',
          'rgba(36,70,108,0.65)',
          'rgba(14,88,97,0.65)',
          'rgba(23,130,146,0.62)',
          'rgba(20,72,98,0.80)',
        ],
      }],
    },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: {
          label: ctx => {
            const d = ctx.dataset.data[ctx.dataIndex];
            return `${d.sets.join(' + ')}: ${d.value.toLocaleString()} patrons`;
          },
        }},
      },
      scales: {
        x: { ticks: { color: '#fff', font: { size: 11, weight: '600' } } },
        y: { ticks: { color: '#374151', font: { size: 11 } } },
      },
    },
  });

  // Chart 2: Compliance Risk Scatter
  destroyChart('t4-riskScatter');
  const EXCL_LIST = ['clean','monitored','flagged','excluded'];
  const scatterDatasets = EXCL_LIST.map(status => ({
    label: status.charAt(0).toUpperCase() + status.slice(1),
    data: patrons.filter(p => p.exclusion_status === status && p.total_wager_frequency > 0)
      .map((p, i) => ({
        x: p.verticals_active + ((p.total_wager_frequency * 3 + i * 7) % 100) / 700 - 0.07,
        y: p.total_wager_frequency,
      })),
    backgroundColor: EXCL_COLORS[status] + 'BB',
    pointRadius: 4,
  }));
  CHARTS['t4-riskScatter'] = new Chart(document.getElementById('t4-riskScatter'), {
    type: 'scatter',
    data: { datasets: scatterDatasets },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } },
      scales: {
        x: { min: 0.5, max: 3.5, title: { display: true, text: 'Regulated Verticals Active' },
          ticks: { stepSize: 1, callback: v => v === 1 ? '1 vertical' : v === 2 ? '2 verticals' : v === 3 ? '3 verticals' : '' } },
        y: { title: { display: true, text: 'Wager Frequency (total wagers)' },
          ticks: { callback: v => fmt.num(v) } },
      },
    },
  });

  // Chart 3: High-Activity Patron Watch List (horizontal stacked bar)
  destroyChart('t4-watchList');
  const topPatrons = [...patrons].sort((a,b) => b.total_wager_frequency - a.total_wager_frequency).slice(0, 10);
  const avgFreq    = patrons.length ? patrons.reduce((s,p) => s + p.total_wager_frequency, 0) / patrons.length : 0;
  CHARTS['t4-watchList'] = new Chart(document.getElementById('t4-watchList'), {
    type: 'bar',
    data: {
      labels: topPatrons.map((p, i) => `Patron ${i+1} (${p.risk_tier.charAt(0).toUpperCase() + p.risk_tier.slice(1)})`),
      datasets: [
        { label: CONFIG.tabs.tab1.label, data: topPatrons.map(p => p.adw_wager_count || 0),     backgroundColor: PALETTE.navy,  stack: 'freq' },
        { label: CONFIG.tabs.tab2.label, data: topPatrons.map(p => p.sports_wager_count || 0),  backgroundColor: PALETTE.blue,  stack: 'freq' },
        { label: CONFIG.tabs.tab3.label, data: topPatrons.map(p => p.charitable_events_attended || 0), backgroundColor: PALETTE.teal, stack: 'freq' },
      ],
    },
    options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } },
      scales: { x: { stacked: true, ticks: { callback: v => fmt.num(v) } }, y: { stacked: true, grid: { display: false } } },
    },
  });

  // Chart 4: Exclusion Enforcement by Operator (grouped bar)
  destroyChart('t4-enforcementBar');
  CHARTS['t4-enforcementBar'] = new Chart(document.getElementById('t4-enforcementBar'), {
    type: 'bar',
    data: {
      labels: OPERATOR_EXCLUSION_FEEDS.map(f => f.operator_name),
      datasets: [
        { label: 'Exclusions Received',   data: OPERATOR_EXCLUSION_FEEDS.map(f => f.exclusion_count),    backgroundColor: PALETTE.slate,  borderRadius: 3 },
        { label: 'Blocked Before Wager',  data: OPERATOR_EXCLUSION_FEEDS.map(f => f.blocks_before_wager), backgroundColor: PALETTE.teal,   borderRadius: 3 },
        { label: 'Detected Breaches',     data: OPERATOR_EXCLUSION_FEEDS.map(f => f.detected_breaches),  backgroundColor: PALETTE.coral,  borderRadius: 3 },
      ],
    },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } },
      scales: { y: { ticks: { callback: v => fmt.num(v) } } },
    },
  });

  // Chart 5: Choropleth
  renderChoropleth('t4-choropleth', buildPatronsByState(patrons));
}
