// ═══════════════════════════════════════════════
// CSV EXPORT
// ═══════════════════════════════════════════════

function downloadCSV(filename, rows) {
  if (!rows.length) { alert('No data to export for current filter selection.'); return; }
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map(row => headers.map(h => {
      const v = row[h] ?? '';
      return typeof v === 'string' && v.includes(',') ? `"${v}"` : v;
    }).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportTab1CSV() {
  const rows = filterDaily(DAILY_PMU, STATE.tab1).map(r => ({
    date: r.date, operator: r.operator_name,
    wager_volume: r.wager_volume, wager_count: r.wager_count,
    deposits: r.deposits, withdrawals: r.withdrawals,
    mobile_wager: r.mobile_wager, web_wager: r.web_wager,
    active_accounts: r.active_accounts, new_registrations: r.new_registrations,
    suspended_accounts: r.suspended_accounts, high_velocity_accounts: r.high_velocity_accounts,
  }));
  downloadCSV('pmu_adw_export.csv', rows);
}

function exportTab2CSV() {
  const rows = filterDaily(DAILY_SPORTS, STATE.tab2).map(r => ({
    date: r.date, operator: r.operator_name,
    wager_volume: r.wager_volume, wager_count: r.wager_count,
    pregame_volume: r.pregame_volume, live_volume: r.live_volume, parlay_volume: r.parlay_volume,
    active_accounts: r.active_accounts, self_exclusion_flags: r.self_exclusion_flags,
    operator_compliance_score_days: r.operator_compliance_score,
    unresolved_violations: r.unresolved_violations,
  }));
  downloadCSV('sports_wagering_export.csv', rows);
}

function exportTab3CSV() {
  const rows = filterEvents(EVENTS_CHARITABLE, STATE.tab3).map(e => ({
    event_id: e.event_id, organization: e.org_name, date: e.date,
    event_type: e.event_type, receipts: e.receipts, attendee_count: e.attendee_count,
    identity_verification: e.identity_verification_flag ? 'Y' : 'N',
    exclusion_matches: e.exclusion_match_count,
    open_compliance_item: e.has_open_compliance_item ? 'Y' : 'N',
  }));
  downloadCSV('charitable_gaming_export.csv', rows);
}

function exportTab4CSV() {
  const rows = filterPatrons(STATE.tab4).map(p => ({
    global_patron_id:          p.global_patron_id ?? '',
    linked_verticals:          p.linked_verticals,
    match_confidence:          p.match_confidence_score ?? '',
    exclusion_status:          p.exclusion_status,
    breach_detected:           p.breach_detected ? 'Y' : 'N',
    days_to_detection:         p.days_to_detection ?? '',
    adw_wager_count:           p.adw_wager_count ?? '',
    sports_wager_count:        p.sports_wager_count ?? '',
    charitable_events_attended: p.charitable_events_attended ?? '',
    total_wager_frequency:     p.total_wager_frequency,
    verticals_active:          p.verticals_active,
    risk_tier:                 p.risk_tier,
    home_state:                p.home_state,
  }));
  downloadCSV('patron_identity_export.csv', rows);
}

document.getElementById('t1-export')?.addEventListener('click', exportTab1CSV);
document.getElementById('t2-export')?.addEventListener('click', exportTab2CSV);
document.getElementById('t3-export')?.addEventListener('click', exportTab3CSV);
document.getElementById('t4-export')?.addEventListener('click', exportTab4CSV);
