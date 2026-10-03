# SF Time: Design Journal

Working notes prepared 2026-09-27. These are an evidence ledger for a possible Chartography design essay, not an essay draft or an imitation of the author's voice.

## September Revision: As Built

This section records the integrated revision after the historical audit below.
It supersedes the later "pending" implementation labels without erasing the
sequence of decisions. Page: `index.html`; numerical contract: `core.js`;
rendering: `app.js`; original artifact: `prototype-july-2026.html`.

- **Window:** 27 Sep 2016 through 26 Sep 2026, 3,652 dates. The data endpoint
  and Jan 1 anchor are explicit. The interval excludes the anniversary at the
  beginning, avoiding an eleventh copy of one calendar date.
- **Geometry retained, bounds corrected:** radius-squared spacing, fixed
  tropical-year angle, real leap days, latest outside, no tile strokes. Full
  half-day corners now remain inside radii 215 and 430. All serialized polygons
  were checked: maximum-minus-minimum area is 0.0396% of the analytical area.
  Equal area is the analytical contract; finite SVG approximations are not
  described as perfectly exact.
- **Legend rebuilt:** units once, ticks located by the actual transform,
  explicit intervals per discrete swatch, tied values kept together, redundant
  quantile boundaries removed. First/last bins are open-ended because summary
  means can extend below the lowest positive raw observation. Exact boundaries
  are retained in the scale and available on interval hover. The 65 F reference
  is named rather than presented as a meteorological threshold.
- **Contrast without losing the raw option:** precipitation, wind energy and
  PM2.5 use a disclosed square-root continuous transform. Original weather hue
  families remain. The background is neutral; zeros stay empty in unsmoothed
  event layers. Hatching identifies missing data and late source cutoffs.
- **Daily smoothing:** None / 7-day / 21-day centered means. The averaging
  occurs along chronological time, not across neighboring pixels or years.
  Null centers stay null; >=80% valid window coverage is required; endpoints
  truncate rather than wrap. Raw values and window coverage stay in inspection.
  With smoothing enabled, a raw-zero day may be colored by its positive mean;
  the legend explicitly discloses that choice.
- **Two polar summary options, plus off:** the default is a thin neutral
  contour. The alternative is a variable-width ribbon using the active daily
  color mapping. Both use calendar-day means with a circular 21-day smooth,
  on a closed non-leap template. Feb 29 remains in the daily field but is omitted
  from this summary. Radius spans the seasonal minimum/maximum, disclosed in
  the caption. The contour deliberately does not change with color bins; the
  ribbon does. Neither is another equal-area year.
- **Center becomes interpretation:** short summaries generated from covered
  values replace the Cartesian chart. They describe monthly peaks, dry-day
  frequency, extremes, and the March 2026 warmth. At phone widths the text
  moves below the circle to remain readable.
- **Sports:** 1,113 completed SF home games, with 49 shared-team dates. Warriors
  blue, Valkyries lavender, Giants orange; stripes preserve both identities.
  Diamonds identify postseason, triangles play-in. All events remain available
  in date inspection, including doubleheaders. Warriors begin with Chase Center
  regular-season play in 2019. The Valkyries' 2025 relocated San Jose playoff
  game is excluded: "home" alone is not enough for a San Francisco chart.
- **Reversal is geometric:** the direction checkbox mirrors every date,
  month interval, endpoint, and seasonal shape. It does not reverse age or data
  order. The outer edge is still recent.
- **Inspection and reuse:** hover, touch/click selection, keyboard-accessible
  date input, and standalone SVG export with embedded colors, legend and summary.
  Dependencies and data are local; opening the page needs no server or network.

### Evidence and Cautions

Weather is now reproducibly fetched from fixed models/cells: ERA5-Land
temperature at 37.8, -122.4; coastal ERA5 for the remaining metrics at 37.75,
-122.5. The first coarse land-selected ERA5 candidate was rejected because it
landed across the bay. Its warmer results demonstrated why coordinates belong
in the design discussion, not just a hidden source URL. Production data ends
20 Sep 2026; no forecast-filled extension. Civil days correctly include
23/24/25 hourly intervals.

The revised temperature series supports a September maximum. March 2026's
mean daily high is 70.33 F, about 10.8 F above the earlier Marches in this
window; its modeled maximum is 81.9 F on 20 March. These are not station-record
temperatures. The coastal proxy averages about 4.65 qualifying hours/day in
July and 4.63 in August: essentially a near tie, not a refutation of "Fogust."
Its threshold and coarse grid cannot establish a neighborhood fog climatology.

EPA Arkansas Street PM2.5 is observed rather than modeled and preserves a fixed
monitor/instrument. Available values end 31 Dec 2024; later displayed dates are
hatched. The 2018 and 2020 episodes stand out, but PM2.5 is not a source-specific
smoke measure. EPA local-standard-time daily bins differ from the weather's
daylight-saving civil dates; this is disclosed.

Verification: numerical geometry/date/null tests; weather and sports parser
self-tests; browser checks across all seven numeric layers and three schemes;
same-day team patterns, postseason inspection, both directions, both views,
smoothing, ribbon mapping, and 390/768/1440-pixel layouts. SVG export was opened
as a standalone image and visually inspected. Screenshots are in the local,
ignored `test-results/` folder. No claims of global visual novelty are made.

### Next Design Comparisons

1. Compare the neutral contour with no summary at all. It is the quieter default;
   the variable ribbon is a useful alternate, particularly for rain.
2. Keep raw daily cells as the default. Use the 7-day mean to reveal spells and
   the 21-day mean for seasonal texture, while recognizing their changed meaning.
3. For an essay about SF rather than coastal models, add observed local station
   temperature and visibility/low-cloud records before sharpening citywide claims.
4. Add a smoke-specific product or documented episode annotations only after
   validating attribution. Find a compatible recent particulate feed before
   extending the EPA layer past its real cutoff.
5. Establish the first Git commit and a remote backup. On this revisit the
   repository had neither commits nor a remote. The old page is preserved here,
   but a same-folder copy is not an off-machine backup.

## Scope and Evidence

- Read all available completed turns of the parent task, **Build time spiral**, task ID `019f4918-d5a6-75b1-9509-a5e8162a3733`, through the original request. The task reader returned 11 completed turns plus an active turn whose items were not exposed. The current assignment supplies the September revision brief; this document does not claim to have read unexposed active-turn messages.
- Inspected `prototype-july-2026.html`, the archived July implementation. References below use its line numbers. Historical assistant reports are distinguished from checks performed for this audit.
- The primary agent is building the current app, with data scripts from other agents. No current-revision implementation or browser behavior is certified here. The parent must finalize those statuses after integration.
- The initial artifact/history audit did not require a corpus. On the user's follow-up, a targeted consultation of Lisa Charlotte Muth's color-scale guidance was added; exact records are listed below. No broad corpus search or voice calibration was performed. No claim of historical priority for the visualization has been researched.
- Only this file and `docs/audit.md` were written by this audit. No app/data edits, commits, or remote operations.

Status vocabulary: **Decision** = explicit user choice; **Prototype** = verified in archived code or read-only computation; **Historical report** = prior assistant's account; **Planned** = current brief, not verified; **Open** = unresolved design choice or audit recommendation.

## Running Decision List

Keep the IDs stable. Add later outcomes rather than rewriting an experiment as though its outcome was known beforehand.

| ID | Choice and reason | Evidence and status |
| --- | --- | --- |
| D01 | Start with one static page and an SVG-friendly preview. Establish the timeline before adding data or interaction. | Original parent request. Decision; interactivity was subsequently added. |
| D02 | Oldest time is inside, newest outside. One day is one pearl on a continuous spiral thread. | Original request. Decision; prototype has necklace mode. |
| D03 | One revolution is a fixed tropical year, `365.24219` days, not a civil year stretched to fit. Anchor one Jan 1 at the top; permit other Jan 1 dates to drift. | User explicitly chose this interpretation after clarification. Decision; prototype uses 2026-01-01 as anchor. |
| D04 | Begin with the past ten years and leave an open center, using roughly the outer half of the radius. | User's first clarification. Decision; July snapshot is 2016-07-09 through 2026-07-09 inclusive, 3,653 days, radii 215 and 430 SVG units. This is a frozen snapshot, not today's rolling ten years. |
| D05 | Add an alternative equal-area fill view: contiguous daily tiles, thick inner turns and thinner outer turns, like a tiled stained-glass window. Retain necklace mode. | User request and explicit approval. Decision; prototype defaults to area fill and uses radius-squared spacing. |
| D06 | Keep the approved area layout and weather colors while refining annotation. | User explicitly asked to preserve both during the July interaction changes. Decision; palette changes in a revision need a stated reason, not an incidental redesign. |
| D07 | Add month-boundary ticks and labels centered on the month intervals. Later remove the colored outer monthly band. | Two explicit requests. Decision; prototype retains 12 labels and a loop generating 13 boundary ticks, but no month-band paths. |
| D08 | Add SF weather as daily color layers. First high temperature, maximum wind, and solar radiation; later precipitation, wind energy, and a fog-related measure. | User requests. Prototype has six weather metrics and month categories. Embedded metadata identifies a modeled grid, not a citywide station record. |
| D09 | Remove the thread in area mode: the fills should carry the form. Keep the thread for necklace mode. | Explicit user request. Decision; prototype renderer follows this distinction. |
| D10 | Remove repeated year labels. Label only first and last dates in `DD MMM YYYY` format. Add date/value hover inspection. | Explicit user request. Decision; prototype implements endpoint labels and pointer/mouse tooltips. Keyboard and touch parity remain audit issues. |
| D11 | Offer continuous color, equal-number-of-marks bins, and equal-data-range bins. | Explicit user request. Prototype has seven bins for discrete modes. Equal-count tie splitting creates misleading differences; see audit A01. Retaining equal values together is a proposed correction, with unequal bin populations disclosed. |
| D12 | Explain each metric's units, source, provider, location, and derivation. | Explicit user request. Prototype has explainers and embedded metadata; reproducibility is incomplete. |
| D13 | Put a minimal dark-gray Cartesian January-to-December seasonal summary in the center. | Explicit user request. Prototype computes calendar-date means then a centered 15-day circular moving average. Month mode falls back to high temperature, an implementation choice rather than an explicit request. |
| D14 | Make zero-valued sparse event cells visually empty, so absence is not a field of low-value color. Compute the event-color bins over positive values. Remove all tile-grid strokes. | User accepted the first two proposed changes and explicitly removed grid strokes. Prototype uses transparent zero fills and `stroke: none`. Zero semantics need to be declared by metric rather than inferred from its observed minimum. |
| D15 | Test a subtle inside seasonal ribbon at roughly weekly frequency without replacing the daily field. | User suggested an inside halo/ribbon and asked about weekly frequency. Prototype uses seven-day slices of the 15-day-smoothed mean, producing 53 slices, not 52 identical weeks. |
| D16 | Reconsider that ribbon: the user found the colored cells improved but questioned whether the inner ring helped. | Last completed parent exchange. The assistant recommended removing the ring and possibly testing a weekly summary track later. That recommendation was not a user-approved final replacement, and removal is not reflected in the archived code. |
| D17 | Preserve the daily tropical-year necklace/equal-area identity, zero-empty behavior, and no tile strokes when returning months later. | Current brief. Decision; current revision verification pending with parent. |
| D18 | Support direction reversal without reversing age, data order, or the newest-outside convention. | Current brief. Planned; archived geometry is clockwise only. Direction should be a sign in the angular transform, not a reversal of data arrays. |
| D19 | Add sports with overlapping events and postseason semantics intact. | Current brief. Planned; no sports data or renderer exists in the archived prototype. Do not collapse several events on one date into an undocumented winner. |
| D20 | Treat fog and smoke-related measures as qualified evidence, not literal readings of the phenomenon their names evoke. | Current brief plus prototype's fog disclaimer. Fog proxy verified in archived metadata; smoke layer and its source are unverified revision work. |
| D21 | Evaluate contour/ribbon summaries as alternatives, not as settled improvements. Preserve an unsmoothed daily view. | Current brief and the failed/weak July ribbon experiment. Open; see options below. |
| D22 | Use D3 value-threshold quantiles that preserve ties; label each discrete swatch with its range, units once; derive continuous tick positions from the actual scale, including the 65 F midpoint. | User's September follow-up describes the app plan. Planned, not current-app verification. A separate read-only test of bundled D3 7.9.0 confirms consistent tied-value mapping but also repeated thresholds/zero-width intervals. |
| D23 | Offer a neutral polar contour independent of the color encoding, an alternative variable-width colored ribbon using the active scale, and center summary text. | User's September follow-up. Planned; these are more specific than the earlier exploratory options. The neutral contour is deliberately not a second color-coded layer. |
| D24 | Offer daily 7-day and 21-day centered means with strict missing centers and coverage handling, retaining raw tooltip values. | User's September follow-up. Planned; window/coverage policy and zero-day behavior still need precise implementation evidence. This is distinct from the archived 15-day-smoothed multi-year seasonal mean. |

## Geometry Contract

Let `Y = 365.24219`, and let `date` and `anchor` be comparable date ordinals in days:

```text
theta(date) = -pi/2 + direction * 2*pi * (date - anchor) / Y
direction = +1 for clockwise in SVG's downward-positive y coordinates
direction = -1 for counterclockwise
x = cx + r*cos(theta)
y = cy + r*sin(theta)
```

Use a date-only ordinal for each local calendar date. This is distinct from counting elapsed local-midnight milliseconds across daylight-saving transitions. The prototype constructs UTC ordinals for the date labels; the embedded weather metadata names America/Los_Angeles for daily aggregation.

The necklace prototype uses radius linear in elapsed days, with fixed-radius pearls. Area mode instead defines `u = (date - start) / Y` and a linear squared-radius function:

```text
R(u)^2 = C + K*u, K > 0
r_inner(u) = R(u - 0.5)
r_outer(u) = R(u + 0.5)
daily angular width = 2*pi / Y
r_outer(u)^2 - r_inner(u)^2 = K
daily area = (1/2) * integral(K * abs(dtheta)) = pi*K / Y
```

The +/-0.5 offsets are **half turns**, not half days. The temporal sides of a tile are separately half a day before/after its date center. This distinction is essential to reproducing the geometry.

The outer edge at parameter `u` equals the inner edge at `u + 1`: their radii match, and their angles differ by a full turn. Successive days also share their temporal edge. These are identities of the continuous geometry. A revolution is not an integer number of days, so daily seams on neighboring turns do not have to align. Independently sampled and rounded SVG polylines only approximate the shared curved boundaries.

The ideal field has no inter-turn gutters. The beginning and ending dates still create partial-turn ends; the chart is not required to fill an entire perfect annulus. Preserve those real endpoints rather than fabricating days to fill it.

The prototype normalizes radial bounds at `u = -0.5` and `u = lastTurn + 0.5`, but tile corners extend another half day. Consequently its actual extremes are about 214.960 and 430.020, just beyond the nominal 215/430. A future bounds calculation can include the full tile extent without changing the idea.

### Equality Is Not Uniform Appearance

Equal area gives equal geometric space to each day. It does not give every day equal apparent width or equal perceptual weight. Circumferential extent grows roughly with radius; radial thickness decreases. Thus inner tiles are narrow around the circle and thick radially, while outer tiles are longer and thinner. This is the intended tradeoff, not a reason to replace the layout with equal-thickness rings.

Visibility also depends on contrast, neighboring colors, shape, scale, and display resolution. With zero-empty fills, equal *allocated* area is not equal colored area: the empty day's slot still exists. With overlapping sports events, the daily slot remains the unit of equality; event submarks must not silently enlarge that day.

## Leap Drift and Calendar Summaries

An anchor Jan 1 is exactly at the top by definition. Other Jan 1 dates have no calendar-based reset to that ray. Relative to one full turn, a 365-day year shifts about -0.238714 degrees clockwise; a 366-day year shifts about +0.746933 degrees. Reverse direction and the signs reverse.

Four civil years containing one leap day total 1,461 days; four modeled tropical years total 1,460.96876 days. Their residual is 0.03124 day, about 0.030792 degrees. Even the Gregorian 400-year cycle differs from 400 modeled tropical years by 0.124 day, about 0.122220 degrees. Therefore neither the four-year leap pattern nor the 400-year civil cycle exactly realigns Jan 1 here. Do not describe Jan 1 as periodically snapping into alignment. Conversely, avoid presenting literal mathematical non-recurrence or an exact astronomical orbit as proven by a fixed, finite-decimal year constant.

The daily spiral and a seasonal summary answer different questions:

- **Geometry:** where a date falls along continuous fixed-year phase and accumulated age.
- **Calendar-date mean:** what the selected years average on a named month/day, followed by an explicitly stated smoothing rule.
- **Phase mean:** what observations average within the same angular phase bins. This aligns exactly with spiral geometry but is not identical to grouping by civil month/day.

The archived center plot uses a 366-day leap-year template. Feb 29 has two observations in this interval, ordinary dates generally ten, and July 9 eleven because both endpoints are included. It smooths the per-date means equally, not the individual observations pooled within each window. This is a definable estimator, but the counts and leap-day policy should be explicit.

The archived ring then takes those 366 calendar slots and maps them onto a `365.24219`-day angular scale. That mixes coordinate systems. Choose and document calendar normalization or tropical phase binning before revisiting a radial summary; do not silently use one system's indices in the other system's transform.

## Color and Data Semantics

- Preserve a distinction between zero, missing, and outside coverage. A zero rain total is a known measurement in the stored precision; missing rain is not a dry day. No scheduled game is only knowable when schedule coverage is complete.
- Empty should mean transparent, not a hard-coded page-colored fill. The prototype chart surface is translucent; transparency also survives a background change. Keep an invisible day's date/value discoverable through inspection.
- Apply zero-empty rules to appropriate sparse/nonnegative measures. A temperature or anomaly of zero is not automatically absence. Preserve valid negative values where the metric allows them.
- Positive-only quantiles answer how large an event was **among positive days**. They do not directly express event frequency. Event frequency needs a denominator that excludes missing days and distinguishes unobserved from inactive dates.
- Tied values cannot always have both identical colors and exactly equal bin populations. The archive splits ties by date index, creating chronological color differences with no value difference. Prefer value-based thresholds and accept uneven or fewer effective bins. Record thresholds and bin counts, including ties, in the legend/data contract.
- Continuous, equal-interval, and quantile schemes are not interchangeable readings. A legend should show the actual mapping. A diverging temperature pivot must have a named meaning; 65 F is a fixed prototype reference, not a computed seasonal anomaly or a scientifically established threshold in this record.
- Nonlinear rain/wind scales, event masks, weekly aggregates, and seasonal anomaly layers were proposed in the parent discussion. They were not adopted as a group. Preserve them as options, not completed features.

## Metric Caveats

**Weather.** Embedded metadata requests coordinates 37.7749, -122.4194 and reports a returned grid point of 37.785587, -122.40964 at 18 m elevation. The provider string says Open-Meteo using ECMWF reanalysis / best-match archive data. These are artifact claims, not independently revalidated source records. A grid point must not become a claim of direct observation everywhere in San Francisco.

**Wind.** The prototype describes daily wind energy density as the sum of `0.5*rho*v^3` over hourly 10 m wind speeds with `rho = 1.225 kg/m^3`. A reproducible derivation must convert mph to m/s, include interval duration, and expose missing-hour coverage. Its `Wh/m^2/day` label describes a daily integral of modeled power per area, not electricity produced by a turbine. The cubic transform emphasizes strong winds; it is one operational definition of "how windy," not an unqualified measurement of lived experience. The archived hourly inputs and derivation script are absent, so the numbers cannot be independently regenerated from this file.

**Fog.** The archived proxy counts hours with weather code 45/48, or low cloud cover >=80% and relative humidity >=90%. The separate embedded fog-code series is all zero. Low cloud plus humidity can describe conditions without proving ground-level fog or reduced visibility at a particular place. Neither zero fog codes nor zero proxy hours proves the absence of actual fog. Retain the proxy name, thresholds, grid location, and denominator/coverage caveat.

**Smoke.** Planned, not in the archive. A general particulate/AQI measure is not source-specific wildfire smoke evidence. Unless the selected source explicitly identifies smoke and supports the attribution, label the measured pollutant or index, describe smoke as a possible interpretation, and avoid attributing a day to a particular fire. A smoke-specific model or plume product would still require its own variable, footprint, time aggregation, and uncertainty description.

**Sports.** Planned, not in the archive. Decide whether marks mean scheduled games, completed games, results, or active season intervals. Keep all same-date events, including cross-sport overlaps and doubleheaders. Record local dates consistently; distinguish postseason from regular season; make preseason/play-in inclusion explicit where applicable. Cancellations, postponements, unknown results, and incomplete coverage must not become zero-event days. Do not infer postseason simply from a fixed month range. A season can cross New Year and need not fit one spiral turn.

Possible overlap encodings include split fills within one day, a count layer with full event details on inspection, or a team/sport filter. Avoid arbitrary blended team colors or last-record-wins fills. The parent must record the actual chosen encoding and verify it with real overlapping dates.

## Summary Options Still Open

1. **No radial summary.** Keep the daily tiles and minimal center plot. This is the lowest-complexity response to the user's criticism of the July ring. It is a recommendation, not a recorded final user selection.
2. **Separate seasonal ribbon.** Use one declared calendar/phase convention; name the statistic and smoothing window. A continuous field need not be implemented as visibly discrete seven-day sectors. Do not call a constant-width color ring a magnitude-width ribbon.
3. **Radial contour.** Encode a phase mean as displacement from a fixed baseline; label the baseline and units. This breaks equal-area semantics for the summary only, so keep it visibly separate from daily tiles. Define whether contour motion is inward or outward and whether zero is meaningful.
4. **Uncertainty ribbon.** Show a spread such as selected percentiles around a seasonal mean rather than a duplicate mean-color ring. This is a different statistic requiring explicit sample counts and interval definition.
5. **Summary adjacent to each turn.** Could preserve year-specific structure but competes with the no-gutters tiled field. It needs a convincing comparison before adoption; it is not the approved geometry.

Seven-day sampling, a 15-day moving average, 52 bins, and ISO calendar weeks are four different choices. Use precise names. Whatever option survives, reversal must also update its angle mapping, arc sweep, labels, and interaction; the Cartesian Jan-to-Dec plot can retain its ordinary reading direction if clearly independent.

### September Plan Clarifications

The follow-up plan narrows the current candidates to a neutral contour and a variable-width colored ribbon, with center summary text. Use a shape/width explanation for the contour rather than pretending the active color legend explains its neutral stroke. The ribbon should reuse the same value-to-color function and thresholds as the daily layer, not independently refit its seasonal values to a fuller palette. Its width still needs its own definition and baseline. These are engineering recommendations consistent with the plan, not claims that the corpus mandates these particular summary forms.

For a piecewise diverging temperature transform, 65 F may occupy the color midpoint even though it is not the midpoint of the numerical domain. Generate both the ramp and ticks using that same transform. Moving only a 65 F label to 50% while sampling a linear-value ramp would retain the old mismatch. Keep the fixed reference distinct from a statistical mean.

Daily centered windows are chronological windows of +/-3 or +/-10 days, not circular windows that wrap the dataset's last date to its first. A missing center must remain missing despite observed neighbors. State the minimum valid observations, expected-window denominator, and endpoint policy; distinguish invalid hourly source coverage from an absent neighboring day. Report raw value, displayed mean, and valid/expected count separately. Do not label a mean of daily precipitation as a seven-day total.

Zero policy needs a recorded choice: a known dry day can have a positive centered neighborhood mean. Coloring by that mean no longer makes every raw zero day empty. Either preserve a raw-zero visibility mask and explain that it conditions the smoothed view, or explicitly make zero-empty refer to the displayed statistic. Do not silently change the meaning while retaining an unqualified "zeros empty" label.

## Targeted Corpus Consultation

Consulted the supplied `design-author-corpora/README-for-ai.md`, `context-library.json`, collection index, Lisa Charlotte Muth manifest/articles/passages, collection quality review, and flagged-article records. Read `design-reference-desk/README.md` to establish that it is the authoring pipeline; source evidence below comes from the published corpus, not duplicated pipeline outputs. No image-specific claims or new figure inspection are involved. The three selected article IDs were absent from the collection's flagged-article list; that is not a whole-corpus quality guarantee.

Research used the author's local `design-author-corpora` collection. Canonical text records: `collections/lisa_charlotte_muth/passages.jsonl`. That research corpus is not part of this repository.

| Source | Exact records used | Supported guidance and limits |
| --- | --- | --- |
| Lisa Charlotte Muth, [When to use classed and when to use unclassed color scales](https://www.datawrapper.de/blog/classed-vs-unclassed-color-scales), 2021-03-16 | Article `doc_2356579e6b7e8f55`; passages `pas_f1a1168dcff46d17`, `pas_35095e35019bbf6c`, `pas_bd4c3098ebe4c451` | Classes support reading ranges; few clearly differentiated classes help; legend design matters independently of discrete versus continuous choice. Application here: explicit ranges, not an unlabeled seven-color strip. This is map-oriented guidance applied by analogy, not a study of this spiral. |
| Lisa Charlotte Muth, [When to use sequential and when to use diverging color scales](https://www.datawrapper.de/blog/diverging-vs-sequential-color-scales) | Article `doc_c5dea34c4cd704d4`; passage `pas_5d42b2e8c2b44570` | Diverging colors require explicit explanation of their extremes. Application here: identify the cool/warm directions and the fixed 65 F reference; do not rely on palette familiarity alone. |
| Lisa Charlotte Muth, [How to choose an interpolation for your color scale](https://www.datawrapper.de/blog/interpolation-for-color-scales-and-maps), 2022-07-25 | Article `doc_77074a775757328b`; passages `pas_003fe6ea2d1cad36`, `pas_835cb8db46957cf3`, `pas_d0273292a8e4d623` | Thresholds determine color classes; quantile redistribution can make common ranges look more extreme; an intentionally transformed scale can put a chosen statistical midpoint halfway through the gradient. Application here: expose real thresholds and match ramp/tick transforms. The source's equal-count description is not evidence about D3 tie handling or a justification for splitting equal values. |

The unit-once layout, interval endpoint convention, D3 tie tests, missing-center rule, and ribbon/contour implementation details are this audit's engineering guidance and/or the user's plan, not attributed to those passages.

## Material for an Eventual Essay

- The initiating problem was a daily timeline that preserves seasonal return without pretending the civil calendar fits an exact circle. The necklace was the first scaffold, not a metaphor applied afterward.
- The equal-area request changed the geometry, not just the styling. The user explicitly wanted older turns thicker and recent turns thinner.
- The empty center began as a response to cramped inner space. A summary later occupied it; that was a separate decision.
- Weather exposed a limit of the daily field: seasonal patterns clear in a Cartesian mean could be hard to see in thousands of daily cells.
- Zero-empty cells and removed tile strokes were an accepted improvement. The inner ring was an experiment the user questioned. Preserve that distinction instead of telling an uninterrupted success story.
- Spatial equality, equal color-bin populations, and equal-value colors are different forms of equality. Their conflicts are useful design material with direct artifact evidence.
- Do not invent firsthand reactions, claim the revisited app solved the open problems, or call the geometry unprecedented without separate research.

Before publication, obtain approved old/new images, record the final revision's actual choices, verify source/coverage details with the data agents, and add measured results from the parent. Historical screenshots were referenced in the chat but were not visually re-examined for this audit.

## Parent Finalization Ledger

- Current revision commit/artifact identity and date: pending; this audit makes no commit.
- Default dataset, span, anchor, and direction: pending.
- Value-tie policy and truthful legends: D3 threshold quantiles and explicit range legends planned; repeated-threshold and ramp-transform verification pending.
- Missing/zero/outside-coverage representation: pending.
- Sports overlap and postseason tests: pending.
- Smoke source and supported label: pending.
- Final summary choice and leap-day policy: neutral contour/active-scale variable-width ribbon and center text planned; final behavior and leap-day policy pending.
- Daily 7/21-day means: planned; coverage denominator, endpoint handling, raw-zero policy, and raw/mean tooltip verification pending.
- Browser/mobile/keyboard verification: pending.

See `docs/audit.md` for prioritized prototype findings, line references, and reproducible read-only checks.

## September 27: Fit the Wheel to the Screen

The stacked header, controls, and legend pushed much of the wheel below the fold at normal browser zoom. The desktop revision places them in a left sidebar, roughly one quarter of the available width, constrained to 320-360 pixels so controls remain readable. The wheel occupies the remaining region but its diameter is also capped by viewport height. A circular graphic needs both constraints; width alone made the original chart too tall.

The wheel remains visible while the reader scrolls longer source notes and inspection details. Color-class legends use labeled swatches in two columns rather than compressing seven intervals into the narrow sidebar. Source details begin collapsed.

The summary text stays in the center only when the wheel exceeds 900 pixels across. Below that size it moves to the sidebar, retaining normal text sizes instead of shrinking or overlapping the polar summary. Below 900 pixels of viewport width, the page stacks controls, legend, wheel, summary, and supporting details. This is a responsive presentation change, not a change to the geometry or data.

Verification includes desktop viewport sizes 1024x768, 1280x720, 1440x900, and 1920x1080, with assertions that the entire SVG fits above the fold and does not overlap the sidebar. Phone and tablet layouts retain horizontal-overflow checks. The existing geometry, scale, smoothing, reversal, sports, inspection, and SVG-export tests remain in place.

### Center Title and Reclaimed Caption Space

The next refinement removes the technical caption beneath the wheel and places its explanation inside the collapsed data details. The wheel can now use all but 40 pixels of viewport height. The inner space always names the selected dataset, units, and any daily smoothing window. Narrative insights are measured against a central square contained within the polar baseline: if the complete text does not fit at readable sizes, it moves to the sidebar. This replaces the earlier fixed 900-pixel rule and prevents the center from becoming anonymous on smaller screens. Daily geometry and the seasonal contour/ribbon are unchanged.

### Readable Precision and Export Scope

Legend precision now follows the metric rather than a generic significant-digit formatter. Rainfall uses hundredths of an inch on continuous ramps, with a less-than label for positive traces below 0.01. Large wind-energy values use grouped thousands. Discrete thresholds add decimals only when rounding would otherwise collapse separate boundaries or round a positive threshold to zero. Exact values remain on hover, and this is a labeling change, not a reclassification of observations.

Exports separate format from scope: SVG or PNG, and the complete page or the square wheel alone. The square removes the interface for reuse as a graphic; the complete page retains settings, legend, narrative, and any expanded data notes. Both are generated from the current rendered layout. SVG keeps actual vector cells and text; PNG is rasterized from the same SVG, at 2000 pixels square for the wheel. Embedded pattern references remain local so overlap stripes and missing-data hatching work away from the app.

### Zero-Based Seasonal Area and Team Filters

For non-temperature metrics, the seasonal summary now defaults to an area extending from a true zero-baseline circle. Radial thickness is proportional to the calendar-day mean (still smoothed over 21 days), rather than stretching the observed minimum to the baseline. This changes the relative prominence of quiet and active seasons. The filled annulus is not itself an area-proportional encoding: radius, not square radius, encodes the mean. Temperature remains exempt and retains a range-scaled contour. The user requested matching medium-light gray fill and outline, implemented as #b2b2b2; the zero baseline remains lightly dashed.

Sports now has three independent team switches. A shared date becomes a single-color date when only one of its teams is selected. Postseason marks, coverage checks, tooltips, counts, and the center title follow the same selection; deselected teams cannot leave behind apparent games or uncertainty. With all teams off, the view explicitly says no teams are selected.

### October 2: Quieter Endpoint Labels

The full start/end dates on the wheel are replaced with muted, tangential year labels. The additional January 1 date is removed because the month ticks already establish the calendar orientation. Full dates remain in the sidebar and day inspection. The outer year sits beyond the daily cells; on large area views the inner year fits between the cells and seasonal summary. Smaller wheels and necklace views place it inside the summary baseline to avoid covering marks. Both positions follow the endpoint angle when direction is reversed.

### The City's Social Seasons

An annual-events layer adds a different kind of seasonality: races, parades, music festivals, and street gatherings. The selection includes the user's seven events plus Bay to Breakers, Outside Lands, Carnaval, and Hardly Strictly Bluegrass. Dates are sourced edition by edition rather than projected backward from a recurrence rule. Pandemic cancellations and virtual editions stay in the archive but do not become colored days of physical gathering.

Burning Man deliberately breaks the geographic boundary. The user identified its SF significance as an exodus: many locals leave the city. It is labeled as a Nevada event, with its official span rather than guessed travel days or attendance counts. This expands the chart's subject from things physically within city limits to rhythms experienced by the city.

Daily cells remain the exact temporal encoding. Each category has a distinct color and an emoji mnemonic; diagonal stripes retain multiple identities on overlapping dates. Optional small emoji sit at the midpoint of an edition, with colliding symbols omitted rather than moved to false dates. The underlying colored days are never removed by symbol decluttering. Independent switches let the reader isolate each annual rhythm, and the center title follows the selection. This layer has no numerical smoothing or seasonal area: categorical occurrence is not a measured continuous quantity.

### October 3: A Compact Contemporary Statistical Plate

Cheysson is a reference for technical composition, not period styling. The useful precedent is the integration of many quantitative elements: charts, scales, tables, and annotations share space without each demanding a large heading or separate panel. No antique-paper treatment or historical lettering reconstruction is intended.

The local style proof keeps the original 320-360 pixel sidebar width. A square wheel is already height-limited on wide screens, so narrowing the sidebar does not necessarily enlarge the chart. Compactness here is vertical: at 1440 x 900 the default sidebar falls from approximately 1,035 to 700 pixels, while its width remains 348 pixels and the wheel remains 860 pixels square. Some space is recovered by collapsing secondary display settings and day inspection, not by deleting their capabilities.

Primary controls use aligned label/value rows. A modest system-serif masthead and chart title, italic caption-sized observations, and tabular numeric comparisons distinguish roles without oversized headings. The temperature interpretation includes September, October, and July mean highs as three aligned quantities. Georgia is the local proof's serif; no proprietary Adobe font files are copied or distributed.

The seasonal summary now has a small radial ruler marking its actual domain. Non-temperature filled areas retain a true zero baseline; temperature retains its range-scaled contour. This ruler and the center's seasonal-mean caption distinguish the summary from the surrounding daily observations. Geometry, data, daily color mappings, and the 21-day seasonal smoothing are unchanged. Compact unit notation keeps the center readable on small screens; full units and dataset limitations remain in the legend and source notes.

Verification: existing geometry, state, browser, event, and export tests, plus `node tests/style.cjs` for vertical footprint, six datasets across five viewport widths, center text bounds, keyboard disclosures, and seasonal ruler visibility. This is an unpublished local design revision for review.

The dataset title also becomes its selector. Title, units, color key, scale controls, and smoothing now form one continuous block rather than a settings form followed by a repeated legend heading. The native select preserves keyboard behavior; compact units sit alongside it, with full unit wording available on hover and in the dataset notes. Sidebar width and wheel dimensions remain unchanged.

### Legends as Distributions; Four Type Roles

The subtitle is now "The Spiral Almanac" and unsmoothed observations are labeled "None (daily)." Discrete legends become variable-width column charts across the same numeric span as the continuous palette. Column width represents the actual numeric interval; height represents the number of colored days in that interval, not probability density. Column area therefore does not encode frequency. Equal-range bins have equal widths; equal-count bins often differ considerably in width. Tied values remain together, so equal-count heights are not necessarily identical. Counts use the currently displayed values, including the selected smoothing window. Missing values and separately keyed zeros do not enter colored bins.

Columns share a zero baseline and a linear count-height scale. Each bin exposes its exact bounds and count on hover and keyboard focus. Numeric tick labels are thinned when they collide, without changing or equalizing the underlying bin widths. All columns, counts, and bounds remain vector elements in SVG exports.

A rendered-text audit at 1440 x 900 found 13 distinct family/size/weight/style combinations on the previous default page, including unintended sizes created by SVG scaling. The revised default has four roles:

| Role | Family | Size | Style |
| --- | --- | --- | --- |
| Title | Georgia | 24 px | Regular |
| Body and numeric labels | System sans | 13 px | Regular |
| Emphasis and selected measure | System sans | 13 px | Semibold |
| Annotation and subtitle | Georgia | 13 px | Italic |

Both named sizes are CSS tokens. Chart labels compensate for SVG scaling to retain the body text size. Small screens use the emphasis role and shorter center titles rather than additional tiny type sizes. Phone charts reserve additional label margins; desktop geometry and dimensions are unchanged. Event emoji are category symbols, outside these four text roles. The universal 13 px body is intentionally more readable than the previous mixture of 10-13 px supporting text. The default sidebar now measures approximately 729 px tall at the audited viewport, still below the original 1,035 px.

`node tests/type-audit.cjs` records the visible text styles. `node tests/histogram.cjs` verifies counts, numeric-width proportions, count-height proportions, colors, exclusions, smoothing, keyboard details, resizing, and SVG/PNG export. The normal responsive and interaction suites also pass.

The name is shortened to "Spiral Almanac." Bin legends now contain only the columns and numeric axis: the separate baseline color strip and its white gap are removed. Per-column counts appear on hover or keyboard focus rather than as permanent labels. Empty bins retain an invisible pointer target, not a colored strip or artificially tall bar.

### Author Footer

The left panel ends with the Info We Trust wordmark and "Design & visualization © 2026 RJ Andrews." The original wordmark is reused from `https://isotype.infowetrust.com/InfoWeTrust-BigCaslon-black.svg`, retained in `vendor/infowetrust-wordmark.svg`, and embedded in the page so offline SVG and PNG exports are self-contained. It remains a brand asset rather than a new interface text style. Isotype's image-collection and fair-use statements are not copied: this project credits its datasets separately in its data notes. Whole-page exports include the author footer; square wheel exports do not. On desktop, flexible space places the footer at the bottom of the sidebar when content is short; on smaller screens it follows the content normally.
