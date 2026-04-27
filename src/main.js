// ═══════════════════════════════════════════════
// CONFIG-DRIVEN INITIALIZATION
// ═══════════════════════════════════════════════

function populateSelect(selectId, options) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  options.forEach(({ value, label }) => {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    sel.appendChild(opt);
  });
}

function initFromConfig() {
  // Header
  document.getElementById('org-name').textContent = CONFIG.agencyName;

  // Tab labels (childNodes[0] is the text node before the badge span)
  ['tab1','tab2','tab3','tab4'].forEach(id => {
    const btn = document.querySelector(`[data-tab="${id}"]`);
    if (!btn) return;
    btn.childNodes[0].textContent = CONFIG.tabs[id].label + ' ';
  });
  const badge = document.querySelector('.p3rl-badge');
  if (badge) badge.textContent = CONFIG.tabs.tab4.badge;

  // Season label in all date range selects
  document.querySelectorAll('option[value="current_season"]')
    .forEach(el => { el.textContent = CONFIG.seasonLabel; });

  // Operator selects (tabs 1, 2, 4) — filtered by vertical
  ['tab1','tab2'].forEach((vertical, i) => {
    const ops = CONFIG.operators.filter(op => op.vertical === vertical);
    populateSelect(`t${i+1}-operator`, ops.map(op => ({ value: op.id, label: op.name })));
  });
  populateSelect('t4-operator', CONFIG.operators.map(op => ({ value: op.id, label: op.name })));

  // Org select (tab 3) — unique org names from EVENTS_CHARITABLE
  const orgs = [...new Set(EVENTS_CHARITABLE.map(e => e.org_name))].sort();
  populateSelect('t3-org', orgs.map(name => ({ value: name, label: name })));
}

// ═══════════════════════════════════════════════
// TAB NAVIGATION
// ═══════════════════════════════════════════════

function switchTab(tabId) {
  STATE.activeTab = tabId;
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
  renderTab(tabId);
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ═══════════════════════════════════════════════
// BAN RENDERING
// ═══════════════════════════════════════════════

function renderBANs(containerId, banDefs) {
  const container = document.getElementById(containerId);
  container.innerHTML = banDefs.map(({ label, value, delta, lead, tooltip }) => `
    <div class="ban-card ${lead ? 'lead' : ''}" ${tooltip ? `data-tooltip="${tooltip}"` : ''}>
      <div class="ban-label">${label}</div>
      <div class="ban-value">${value}</div>
      ${delta ? `<div class="ban-delta ${delta.startsWith('▲') ? 'pos' : 'neg'}">${delta}</div>` : ''}
    </div>
  `).join('');
}

// ═══════════════════════════════════════════════
// FILTER WIRING
// ═══════════════════════════════════════════════

function wireFilter(elId, stateTab, stateKey) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.addEventListener('change', () => {
    STATE[stateTab][stateKey] = el.value;
    renderTab(STATE.activeTab);
  });
}

wireFilter('t1-operator',    'tab1', 'operator');
wireFilter('t1-dateRange',   'tab1', 'dateRange');
wireFilter('t1-channel',     'tab1', 'channel');
wireFilter('t1-accountStatus','tab1','accountStatus');

wireFilter('t2-operator',    'tab2', 'operator');
wireFilter('t2-dateRange',   'tab2', 'dateRange');
wireFilter('t2-wagerType',   'tab2', 'wagerType');
wireFilter('t2-accountStatus','tab2','accountStatus');

wireFilter('t3-org',              'tab3', 'org');
wireFilter('t3-dateRange',        'tab3', 'dateRange');
wireFilter('t3-verificationStatus','tab3','verificationStatus');
wireFilter('t3-eventType',        'tab3', 'eventType');

wireFilter('t4-operator',      'tab4', 'operator');
wireFilter('t4-dateRange',     'tab4', 'dateRange');
wireFilter('t4-segment',       'tab4', 'segment');
wireFilter('t4-exclusionStatus','tab4','exclusionStatus');

// Reset buttons
const TAB_DEFAULTS = {
  tab1: { operator:'all', dateRange:'full_year', channel:'all', accountStatus:'all' },
  tab2: { operator:'all', dateRange:'full_year', wagerType:'all', accountStatus:'all' },
  tab3: { org:'all', dateRange:'full_year', verificationStatus:'all', eventType:'all' },
  tab4: { operator:'all', dateRange:'full_year', segment:'all', exclusionStatus:'all' },
};

function resetTab(tabId) {
  Object.assign(STATE[tabId], TAB_DEFAULTS[tabId]);
  const n = tabId.slice(-1);
  document.querySelectorAll(`#${tabId} .filter-select`).forEach(sel => {
    const key = sel.id.replace(`t${n}-`, '');
    sel.value = STATE[tabId][key] ?? 'all';
  });
  renderTab(tabId);
}

['tab1','tab2','tab3','tab4'].forEach(id => {
  const n = id.slice(-1);
  document.getElementById(`t${n}-reset`)?.addEventListener('click', () => resetTab(id));
});

// ═══════════════════════════════════════════════
// CHART TOOLTIP ICONS
// ═══════════════════════════════════════════════

const CHART_TOOLTIPS = {};   // populated by each renderTabN with canvasId -> tipText

function applyChartTooltips() {
  Object.entries(CHART_TOOLTIPS).forEach(([canvasId, tipText]) => {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const card = canvas.closest('.chart-card');
    if (!card) return;
    const titleEl = card.querySelector('.chart-title');
    if (!titleEl || titleEl.querySelector('.chart-info-icon')) return;
    const icon = document.createElement('span');
    icon.className = 'chart-info-icon';
    icon.setAttribute('data-tooltip', tipText);
    icon.textContent = 'i';
    titleEl.appendChild(icon);
  });
}

// ═══════════════════════════════════════════════
// RENDER DISPATCHER
// ═══════════════════════════════════════════════

function renderTab(tabId) {
  if (tabId === 'tab1') renderTab1();
  else if (tabId === 'tab2') renderTab2();
  else if (tabId === 'tab3') renderTab3();
  else if (tabId === 'tab4') renderTab4();
  applyChartTooltips();
}

// ── Startup ──
initFromConfig();
renderTab('tab1');

(function smokeTest() {
  const errors = [];
  if (DAILY_PMU.length   !== 365 * PMU_OPS.length)   errors.push('DAILY_PMU count wrong');
  if (PATRONS.length < 1000)                           errors.push('PATRONS count low');
  if (EVENTS_CHARITABLE.length < 90)                  errors.push('EVENTS_CHARITABLE count low');
  if (errors.length) console.error('SMOKE TEST FAILURES:', errors);
  else console.log('All startup checks passed');
})();
