# Gaming Regulator Identity Resolution Demo — Backlog

Items are roughly prioritized within each section. Reference the src/ file most relevant to each fix.
Build with `node build.js` (KY default) or `node build.js --config ny` / `--config la`.

---

## Bugs

<!-- Add bugs here as: - [ ] **Short name** — description. Affects: `src/file.js`. -->

---

## Enhancements

<!-- Add enhancements here as: - [ ] **Short name** — description. Affects: `src/file.js`. -->

---

## Config / Data

<!-- Items related to config files, synthetic data accuracy, or new state configs. -->

- [ ] **Add more state configs** — WA, NJ, MI, IL, CO are high-priority gaming states. Copy config.ky.js pattern and adjust operators, dataScale, stateWeights, seasonLabel, and tab3 label (WA/NJ/MI/IL are commercial casino states, not charitable gaming). Affects: `configs/`.

---

## Epics

> ⚠️ **Stop and discuss before starting any epic.** Epics require significant scope decisions before implementation.

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
