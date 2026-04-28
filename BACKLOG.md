# Gaming Regulator Identity Resolution Demo — Backlog

Items are roughly prioritized within each section. Reference the src/ file most relevant to each fix.
Build with `node build.js` (KY default) or `node build.js --config ny` / `--config la`.

---

## Bugs

- [x] **Tab 3: Verification rates always 0%, compliance items always 0** — Root cause: `deterministicVariance()` returns 0.88–1.12 (it's a wager-volume multiplier), but `generateEventsCharitable()` uses it as a 0–1 probability check against `verRate` (0.15–0.33). Since 0.88 > 0.33 always, `deterministicVariance(...) < verRate` is always `false`. Fix: add a dedicated `deterministicProb(dateStr, id, salt)` function that returns a true 0–1 value (e.g., `((h >>> 0) % 1000) / 1000`) and use it for all boolean/probability checks in `generateEventsCharitable()`. Affects `identity_verification_flag`, `exclusion_match_count`, and `has_open_compliance_item` — all three are broken by the same root cause. Affects: `src/data.js`.

- [x] **Choropleth maps render small in upper-left corner** — Visible on Tabs 1, 2, and 4. The SVG container's `getBoundingClientRect()` returns near-zero dimensions when the chart is first rendered (the section may not be fully visible or layout hasn't settled). The map draws at ~150px wide instead of filling its 300px-tall container. Fix options: (1) Use `ResizeObserver` on the SVG element and re-render on first nonzero size, (2) set explicit `width: 100%` on the SVG via CSS before D3 reads dimensions, or (3) defer choropleth render with `requestAnimationFrame`. The KY-weighted states should also be visually prominent — consider a stronger color floor so neighboring states read at visible intensity, not near-white. Affects: `src/charts.js` (`renderChoropleth`), `src/style.css`.

- [x] **Tab 4 Compliance Risk scatter: tooltips not meaningful, flagged/excluded dots hidden** — Two issues: (1) Default tooltip shows raw `(x, y)` coordinates, not patron context. Should show exclusion status, verticals active, wager frequency, and breach flag (e.g., "Excluded • ADW + Sports • 187 wagers • Breach detected"). (2) Datasets are rendered in order `[clean, monitored, flagged, excluded]` — since clean has ~880 dots, it draws over the smaller excluded/flagged sets. Fix: reverse dataset order so `excluded` and `flagged` render last (on top), keeping the legend order unchanged via a separate legend sort. Affects: `src/charts.js` (`renderTab4`).

---

## Enhancements

- [ ] **Chart informational tooltips ("i" icons) on all charts** — The `CHART_TOOLTIPS` object and `applyChartTooltips()` infrastructure already exists in `main.js` and fires on every render, but no `renderTabN()` function actually populates `CHART_TOOLTIPS[canvasId]`. Fix: add a `CHART_TOOLTIPS['canvas-id'] = 'explanation text'` assignment in each render function before the `new Chart(...)` call. Write one sentence per chart explaining what it shows and what to look for — focus on what a regulator would ask ("Why does this spike in May?" "What does a high rate here mean?"). All four tabs need entries. Affects: `src/charts.js`.

---

## Config / Data

<!-- Items related to config files, synthetic data accuracy, or new state configs. -->

- [ ] **Add more state configs** — WA, NJ, MI, IL, CO are high-priority gaming states. Copy config.ky.js pattern and adjust operators, dataScale, stateWeights, seasonLabel, and tab3 label (WA/NJ/MI/IL are commercial casino states, not charitable gaming). Affects: `configs/`.

---

## Epics

> ⚠️ **Stop and discuss before starting any epic.** Epics require significant scope decisions before implementation.

### Epic — Gaming Commission Audience Review (Domain + UX Audit)

A full pass through every tab asking: "Would a gaming commission regulator have this data, care about this metric, and understand this chart?" The demo currently tells a coherent technical story but hasn't been pressure-tested against the actual regulatory workflow.

**Known question going in:** "Deposits vs. Withdrawals by Day" (Tab 1) — this is operator-side financial data. Regulators typically see aggregate reports, not daily operator-level cashflow. Is this chart showing something a KHRGC analyst would actually monitor, or is it noise that undercuts credibility?

**Scope of review:**
- Tab 1 (PMU/ADW): Audit each BAN and chart against what a horse racing commission actually receives in operator reports. Flag anything that looks like internal operator data vs. regulator-facing reporting data. Propose replacements for weak charts.
- Tab 2 (Sports Wagering): Same audit. "Wager Type Mix by Month" — do regulators receive pregame/live/parlay breakdowns, or just total handle? "Operator Compliance Score" metric — is "1.2d avg" a real regulator KPI?
- Tab 3 (Charitable Gaming): After the data bugs are fixed, review whether event-level metrics match how charitable gaming is actually reported (event filings, not daily transactions).
- Tab 4 (Patron Identity): Mostly sound — this is the core P3RL story. Check BAN labels for regulator language ("Active Exclusions" vs. "Self-Exclusion Entries on File").
- Cross-tab: Are tab labels (Pari-Mutuel / ADW, Sports Wagering, Charitable Gaming) the right words for the KY audience? KHRGC uses "advance deposit wagering" in statute — does that match?

**Deliverable:** A revised `src/charts.js` and/or `src/data.js` with weak charts replaced or relabeled, plus a short summary of changes made and rationale. The `frontend-design` skill should be invoked for any layout/visual changes; domain judgment on metric relevance comes from the plan author.

**Why it matters for the pitch:** A regulator who sees data they'd never have access to will disengage. Credibility depends on the demo feeling like it understands their world, not just their technology stack.

---

### Epic — Additional State Configs (WA, NJ, MI)

Multi-state flexibility is the core demo differentiation. Washington (tribal gaming + lottery), New Jersey (legacy commercial casino + online), and Michigan (tribal + commercial + iGaming) each have distinct vertical mixes that stress-test the config-swap architecture.

**Why it matters for the pitch:** Live config swap in the room ("now let me show you the same platform for your state") is the highest-impact demo moment. The more states preloaded, the more prospects feel seen.

---

### Epic — Self-Exclusion Drill-Down (Tab 4)

The current Tab 4 shows aggregate breach metrics. A drill-down showing individual breach records (anonymized) — patron ID, originating operator, breaching operator, days-to-detection, wager amount — would demonstrate operational workflow value, not just analytics.

**Data model changes:** Add `BREACH_RECORDS` dataset (one row per detected breach, seeded from PATRONS.breach_detected).

**New UI:** Scrollable table below existing Tab 4 charts, filterable by exclusion status. Each row links to the enforcement bar chart operator for cross-reference.

**Why it matters for the pitch:** Regulators don't just want to see trends — they want to see the queue they'd act on. A table of actionable breach records is closer to the actual product than a chart.

---

### Epic — Time-Lapse Replay Mode

A "play" button that animates the daily data forward chronologically — showing how violation counts, wager volume, and exclusion breach rates evolve over the season. Designed as a conference-room demo moment.

**Implementation:** Driven by a timer that steps `filterDaily` through a rolling 30-day window and re-renders charts. Pause/resume/speed controls.

**Why it matters for the pitch:** Motion in a demo is memorable. Watching a violation count tick up in real time makes the problem visceral in a way static charts don't.

---

### Epic — Responsible Gambling Risk Score Tab

A fifth tab framed around responsible gambling analytics — patron risk scoring, time-on-device patterns, loss-chasing signals, proactive outreach queue. Positions P3RL not just as compliance enforcement but as a proactive harm-reduction tool.

**Why it matters for the pitch:** Shifts the conversation from "catching bad actors" to "protecting your patrons" — a more defensible regulatory posture and a broader sales story.
