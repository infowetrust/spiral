# SF Time: Archived Prototype Audit

Prepared 2026-09-27. Read-only examination of `prototype-july-2026.html`; the only deliverables written are this file and `docs/design-journal.md`.

## Scope and Verification Boundary

Artifact SHA-256: `31299a56802bdb6e64ae5fdd896c22395605736e625c181382529a8a6db25da6`.

All code references below refer to the archived prototype, not the evolving `index.html`. The parent task's 11 completed turns were read, including the original request and last ribbon critique. Its current active turn exposed no message items through the task reader; current work requirements come from the present assignment.

Checks performed: static HTML/CSS/JavaScript inspection; Node JavaScript parse; in-memory execution of the archived script with a minimal mocked DOM and the final rendering calls replaced by an export of calculation functions; array/count checks; quantile tie examples; polygon areas computed from the actual serialized tile paths; algebraic/date checks. No application file was changed to run these checks.

Not performed: a new browser render, screenshots, keyboard/touch tests, live data refetch, independent regeneration of hourly-derived data, or a current-revision audit. Historical parent messages report browser checks, but those are not new evidence from this audit. A targeted corpus consultation and isolated bundled-D3 check were added after the user's follow-up; see below. No commits or remote operations were performed.

## Findings

### A01 / P2: Equal-count bins give identical values different colors

**Evidence:** `quantileBinsByIndex`, lines 557-565, sorts by value then date index and bins by individual rank. All ties crossing a rank boundary are split. This happens in the actual embedded data, not just a hypothetical fixture: one fog-proxy hour on 2016-07-23 is bin 0; one hour on 2025-06-12 is bin 1. Positive rain ties split at 0.02, 0.04, 0.11, 0.22, 0.35, and 0.61 inches. Temperature, maximum wind, and solar radiation also split ties.

**Impact:** repeated values can appear to change over time simply because older tied observations are assigned lower bins. This is particularly misleading for integer-valued fog hours. It fulfills near-equal mark counts by sacrificing a consistent value-to-color mapping.

**Recommended revision:** use value-based thresholds, preserve ties, allow uneven/fewer bins, and disclose actual thresholds/populations. Do not silently promise exact equal counts. Test that identical values always receive identical colors regardless of input order. Current fix status: unverified.

### A02 / P2: Legends do not faithfully describe the selected mapping

**Evidence:** lines 978-1013 render quantile ramps as seven equal-width bands but label only minimum, arithmetic midpoint, and maximum. The precipitation positive median is 0.16 inches, while its displayed arithmetic midpoint is 2.425 inches (formatted to 2.42 by JavaScript). That middle label is not a quantile boundary or median. The temperature legend always labels 65 F in the middle, even when discrete modes ignore the pivot. In continuous mode, equal-value sampling places 65 F at about 34.18% of the ramp domain, while the three-label layout puts its label near the middle.

**Impact:** readers cannot recover class boundaries and may assign the wrong numerical meaning to the center color. The same apparent legend structure masks different semantics.

**Recommended revision:** derive bands, boundary labels, and continuous tick positions from the actual scale; disclose tie handling and missing/zero symbols. Give the 65 F pivot a stated rationale or avoid implying it is a computed normal. Current fix status: unverified.

### A03 / P2: The radial summary mixes calendar bins with tropical phase

**Evidence:** lines 802-820 collect month/day means into a 366-day template (`SEASON_YEAR = 2020`, line 448). `angleForSeasonDay` at line 605 divides by 365.24219, while `renderSeasonalRibbon` at lines 856-865 samples those calendar-indexed means only up to the tropical-year endpoint. The 366 slots are therefore neither evenly normalized around one calendar-summary circle nor consistently mapped into tropical phase bins.

**Impact:** the ring's dates after leap day do not share the same convention as the anchor year's month labels. Calendar slots and fractional angular intervals acquire an implicit, undocumented weighting at the wrap. A ring read as aligned with the daily geometry can be phase-shifted.

**Recommended revision:** choose calendar-normalized summary coordinates or calculate means directly in tropical phase bins. Explicitly decide leap-day treatment and year-wrap behavior. Test dates around February/March and December/January, in both directions. Current fix status: unverified.

### A04 / P2: Sparse-data semantics are inferred from sample minima

**Evidence:** line 576 enables `zeroAsEmpty` whenever the dataset minimum is exactly zero and any zero exists. Lines 701-706 do distinguish nonfinite values (gray) from zero (transparent), which is worth preserving. The legend at lines 995-1013 only discloses zero-empty behavior, with no missing-data key. Every stored metric currently has 3,653 finite values, so missing behavior is not exercised by this dataset.

**Impact:** a future temperature/anomaly series with zero as a legitimate value can disappear incorrectly; a sparse metric's visual policy changes with its observed range. Missing gray is not explained, and a coverage gap could be confused with a valid class when new data arrives.

**Recommended revision:** explicit per-metric zero policy, missing/coverage status, and legend. Test zero-only, missing-only, negative/positive, tied, and single-valued series. Preserve invisible zero marks' inspectability without restoring cell strokes. Current fix status: unverified.

### A05 / P2: The central summary overstates comparability and loses scale context

**Evidence:** lines 806-834 average by calendar date, then give every finite per-date mean equal weight in a circular 15-day moving average. The archived interval provides two Feb 29 observations, eleven July 9 observations, and generally ten per ordinary date. Lines 902-960 autoscale each metric to its own seasonal minimum/maximum without numerical y-axis labels. The title is always "10-year smoothed avg." Lines 893-895 substitute temperature when month mode is selected.

**Impact:** the curve is useful for shape, but magnitudes and confidence cannot be inferred reliably. Small and large seasonal ranges fill the same vertical space, and February 29 is estimated from far fewer years. The inclusive endpoint and default temperature substitution are hidden assumptions.

**Recommended revision:** retain the minimal visual treatment but name the estimator/window and actual coverage; provide enough scale information to avoid magnitude confusion. Decide whether smoothing is over calendar-date means or pooled observations, with an explicit leap policy. Keep month-mode summary labeling unambiguous. Current fix status: unverified.

### A06 / P2: Advertised daily detail is pointer-only and too small when scaled down

**Evidence:** daily marks are created without focus behavior at lines 1096-1116. Tooltip listeners at lines 1205-1213 are pointer/mouse-only; there is no keyboard/date-selection or durable tap selection. The SVG description at lines 406-408 says every mark is a dot even in default area mode. The responsive SVG scales the 1,000-unit viewBox to available width (lines 189-193), including 10-14-unit text and narrow daily marks.

**Impact:** the advertised date/value inspection is not equivalently available to keyboard users, and a one-day target becomes very small on a phone. Native SVG titles are not a substitute for an explicit accessible inspection path. Browser/touch behavior was not tested anew here.

**Recommended revision:** one navigable selected-date state, keyboard advancement, tap inspection, accessible current-value text, and view-specific descriptions. Avoid forcing keyboard users through 3,653 individual tab stops. Verify actual small-screen legibility and target sizes, not only absence of horizontal overflow. Current fix status: unverified.

### A07 / P2: Fixed dark-gray summary conflicts with the automatic dark theme

**Evidence:** lines 21-32 switch the background to a dark surface, but summary strokes/text remain `#444` at lines 270-295. The original user requested a dark-gray summary; the app also independently offers automatic dark styling.

**Impact:** summary contrast drops substantially in dark mode. Transparent zero cells correctly adapt to the surface, but other palette/opacity combinations also require visual checks against it. This finding is based on CSS, not a new screenshot or a measured accessibility contrast certification.

**Recommended revision:** either retain a deliberately light chart surface or use a tested neutral summary color for each supported theme. Verify positive faint marks remain distinguishable from empty space. Current fix status: unverified.

### A08 / P2: Embedded derived data is not independently reproducible

**Evidence:** the large `WEATHER_DATA` object at line 464 includes a request URL, arrays, units, grid coordinates, and a broad provider string. It lacks retrieval timestamp, resolved model/version, raw hourly samples, derivation script, and hourly coverage flags. Lines 516 and 541 describe wind and fog derivations but do not perform them. Length validation at lines 571-574 cannot detect an equally sized but shifted date array because explicit source dates are absent.

**Impact:** the file can be displayed offline, but the provenance and hourly-derived numbers cannot be independently reconstructed from the artifact. Finite daily values do not prove complete hourly coverage. A model-grid proxy must not become a station observation through abbreviated labels.

**Recommended revision:** have the data agents preserve source requests, retrieval dates, explicit date keys, units, resolved dataset identity where available, transformation definitions, and coverage/missing rules. Check date-key alignment, unit conversion, and daylight-saving aggregation conventions. Do not infer wildfire-specific smoke from a general PM/AQI series. Current data-script implementation: outside this audit.

### A09 / P3: Exact geometry claims exceed the serialized polygon precision

**Evidence:** lines 594-597 implement squared-radius spacing correctly. Lines 641-662 sample five subdivisions per edge and round coordinates to two decimals. Across all 3,653 actual serialized paths, shoelace areas range from 108.22785 to 108.64805 square SVG units, mean 108.44761. Max-minus-min is about 0.38747% of the mean. The analytical ideal is 108.4476217 per day. A historical assistant reported about 0.14% spread from sampled tiles; that is not the all-tile result.

The continuous inter-turn boundaries coincide analytically, but neighboring turns use phase-offset daily sampling grids because the year length is fractional. Their separately approximated polylines need not be exactly coincident. The nominal inner/outer bounds also omit half-day corner extension (lines 489-490), reaching about 214.95986 and 430.02007 instead of 215 and 430.

**Impact:** the core equal-area construction is sound, but "exact" raster/path equality and perfectly shared rendered edges should not be claimed. Stroke removal can expose antialias seams; their visibility remains untested here. The tiny bound excursion is not an observed clipping failure.

**Recommended revision:** preserve the construction, test all tiles and full tile bounds, and use sufficient/shared boundary precision. Check seams at multiple sizes and device pixel ratios. Do not fix apparent seams by adding prohibited tile strokes. Current fix status: unverified.

### A10 / P3: Labels imply a fresher and more exact calendar reference than exists

**Evidence:** fixed dates/anchor at lines 439-441; "past ten years" SVG title/section at lines 403-405; one top "Jan 1" label at line 410; month labels/ticks use the anchor year at lines 1016-1057. The month-boundary loop includes both January endpoints, generating 13 ticks around a circle where those endpoints are close but intentionally not coincident.

**Impact:** after months, "past ten years" describes the frozen July window, not the current date. The unlabeled Jan 1 anchor can be read as a shared alignment rule despite intentional leap drift. Anchor-year month ticks are approximate seasonal reference for other years, not exact boundaries of every turn.

**Recommended revision:** disclose the frozen range and anchor year; retain intentional drift. If updating the range, make it an explicit revision rather than silently changing the historical artifact. Decide how to handle the two nearby January ticks. Current revision span/anchor: unverified.

## Decisions Not to Mistake for Bugs

- Radius-squared spacing, thick inner turns, thin outer turns, and daily calendar seams that do not line up exactly across turns are intentional.
- Area mode omits the thread at lines 1096-1122; necklace mode retains it. "No strokes" in the approved July progression concerns tile-grid strokes, not automatically every annotation or the necklace thread.
- Transparent zeros are implemented; precipitation has 2,860 zero days and 793 positive days, fog proxy 2,175 zero days and 1,478 positive days. All six selectable numeric arrays have 3,653 finite entries. Finite is not a guarantee of valid provenance.
- Missing values already have a different fill and a "missing" tooltip formatter (lines 702-704 and 739-742). The problem is disclosure and future semantics, not an existing blanket conversion of all missing values to zero.
- The inner ribbon still exists in the archive. The last user message questioned it; the assistant's suggestion to remove it is not evidence that removal was implemented or that a particular replacement was approved.
- There is no sports layer, smoke layer, direction toggle, or contour mode in the archived prototype. These are current revision requirements/options, not regressions in functionality that once existed here.

## Revision Acceptance Checklist

The parent should record results against the integrated revision, not mark these complete from this document.

- [ ] Date positions obey the fixed-year formula in both directions; newest stays outside; no date-array reversal or off-by-one shift.
- [ ] Daily analytical areas are equal and serialized-path tolerances are measured over all tiles; full bounds include half-day edges; stroke-free rendering has been inspected.
- [ ] Jan 1 drift is preserved across common/leap years and century boundaries; anchor/year labels are truthful.
- [ ] Summary coordinates, leap-day policy, wrap smoothing, units, and sample counts are explicit.
- [ ] Identical values share colors; class boundaries and pivot positions match legends; zero/missing/outside-coverage are distinct.
- [ ] Repeated quantile thresholds do not produce misleading zero-width swatches; interval inclusivity and displayed precision match the actual threshold comparison.
- [ ] Neutral contour has its own magnitude/baseline explanation; colored ribbon reuses the active scale without secretly refitting its summary distribution.
- [ ] Daily 7/21-day means keep missing centers missing, disclose coverage/edge policy, do not wrap chronological endpoints, and retain raw tooltip values. Raw-zero versus displayed-mean visibility is explicitly decided.
- [ ] Zero-only, all-missing, tied, constant, negative, and sparse series have defined behavior.
- [ ] Sports fixtures cover same-day overlaps, doubleheaders, year-crossing seasons, postseason, cancellations, and incomplete coverage without overwriting events.
- [ ] Weather/fog/wind/smoke names match their sources and derivations; date alignment and hourly coverage are tested; smoke attribution is not overclaimed.
- [ ] Keyboard and touch users can inspect dates/values; current view descriptions and small-screen labels are usable.
- [ ] Theme/contrast, direction-sensitive SVG arc sweeps, month-label placement, and endpoint labels are visually checked on desktop and mobile.
- [ ] Final summary choice is recorded in the design journal as implemented/verified, with before/after visual evidence.

## Reproduction Notes

No test files were added. The audit used Node's `fs`, `vm`, and `crypto` built-ins. It read the inline script, parsed it with `vm.Script`, and evaluated an in-memory copy with no-op event-listener DOM stubs. The closing calls to `drawMonthScale()` and `render()` were replaced in memory with an export of `DATASETS`, `WEATHER_DATA`, and the geometry/summary functions. This checks the actual archived calculation code but does not simulate rendering or interaction.

For each day, `areaCellPath(i)` was parsed into its serialized x/y pairs, then measured with the polygon shoelace formula. Quantile bins were grouped by equal numeric value to detect tie splitting. Calendar counts were recomputed with the archive's `dayOfSeason()` function. Drift checks used the supplied fixed year constant and integer civil-day counts; no astronomical accuracy beyond that model is asserted.

The highest-priority corrections for the parent are semantic: consistent colors for equal values, honest legends, explicit calendar/phase treatment, and credible data/coverage labels. They can be addressed without discarding the approved spiral geometry.

## September Follow-Up: Planned Resolution, Not Verification

The user reports this app plan: D3 true quantile thresholds preserving ties; a discrete range label for each swatch with units once; continuous ticks derived from the real scale including the 65 F midpoint; an independently neutral polar contour; an alternative variable-width ribbon colored by the active scale; center summary text; and daily 7/21-day centered means with strict missing centers/coverage and raw tooltips preserved. This substantially addresses the direction of A01/A02 and makes the summary options more concrete. It does not close the archived findings or verify the integrated revision.

Concise implementation recommendations:

1. **Quantiles:** label the mode "Quantiles" rather than promising exact equal populations. Check both threshold duplication and tied-value consistency. A read-only execution of the workspace's bundled D3 reports version 7.9.0. For domain `[1,1,1,1,2,2,3]` and seven output bins, thresholds are approximately `[1,1,1,1.428571,2,2.142857]`; all values of 1 map to bin 3, while bins 0-2 have inverted extents `[1,1]`. Do not present those zero-width intervals as useful classes. Keeping nonzero-width classes with no raw observations can still be necessary if the same scale colors smoothed values; do not equate "no raw members" with "impossible interval."
2. **Discrete legend:** derive intervals from the actual scale, use clear lower-inclusive/upper-exclusive notation with the maximum included in the last finite interval, and define clamped tails. Units once in the shared legend heading is appropriate. Increase precision where rounding would collapse distinct thresholds; do not invent rounded classification bounds while classifying with unrounded ones. If redundant thresholds are removed or colors reassigned, do that in the scale and legend together.
3. **Continuous legend:** build ramp colors and tick coordinates from one transform. A piecewise diverging transform can put 65 F at 50%; a linear value axis does not, given the archived extrema. Do not combine one ramp convention with the other's tick positions. Test endpoints, pivot, and at least one intermediate value per side.
4. **Contour/ribbon:** the deliberately neutral contour needs shape-based magnitude/baseline context, not a color-match fix. The colored ribbon should reuse the same mapping as the daily field, including quantile thresholds, zero/missing policy, and clamp behavior. Explain its width scale separately. Seasonal or smoothed positive values may fall below the smallest positive raw-day observation; ensure the legend's lower tail remains truthful. Avoid refitting the ribbon to its own distribution merely to increase saturation.
5. **Daily smoothing:** windows are +/-3 or +/-10 chronological days; never wrap the end of the ten-year series to its beginning. Keep a missing center missing; define valid/expected coverage, minimum coverage, and treatment of truncated endpoints. Tooltip should distinguish raw value, displayed mean, and coverage. A mean rain value is not a window total. Decide whether a raw zero stays transparent when its neighborhood mean is positive; masking by raw zero and coloring a complete mean field are different designs.

## Source Ledger for Added Guidance

Targeted source: Lisa Charlotte Muth collection in the author's local `design-author-corpora` research library, which is not part of this repository. Orientation followed that library's `README-for-ai.md`, `context-library.json`, collection index and manifest; substantive claims were checked against `passages.jsonl`, not just synthesized article summaries. Collection quality review was consulted and the three chosen article IDs were not in `flagged-articles.jsonl`. `design-reference-desk/README.md` was read as pipeline orientation only. No figure-specific claims are made.

- **Range readability and legends:** article `doc_2356579e6b7e8f55`, passages `pas_f1a1168dcff46d17`, `pas_35095e35019bbf6c`, `pas_bd4c3098ebe4c451`. Muth's [classed/unclassed discussion](https://www.datawrapper.de/blog/classed-vs-unclassed-color-scales) supports explicit readable class ranges and treating legend design as its own task. Applied here by analogy from maps, not as empirical validation of a spiral.
- **Diverging extremes:** article `doc_c5dea34c4cd704d4`, passage `pas_5d42b2e8c2b44570`. Muth's [sequential/diverging discussion](https://www.datawrapper.de/blog/diverging-vs-sequential-color-scales) supports clear labeling of both ends of a diverging scale. It does not establish 65 F as the correct scientific reference for this project.
- **Thresholds and transformed gradients:** article `doc_77074a775757328b`, passages `pas_003fe6ea2d1cad36`, `pas_835cb8db46957cf3`, `pas_d0273292a8e4d623`. Muth's [interpolation discussion](https://www.datawrapper.de/blog/interpolation-for-color-scales-and-maps) explains class cut points, the changed visual emphasis of quantiles, and explicitly transformed midpoint placement. It does not specify D3's behavior on ties; the fixture above is separate local code evidence.

Range-endpoint notation, units-once presentation, strict missing-center behavior, repeated-threshold handling, and the specific contour/ribbon architecture are engineering recommendations or user decisions, not invented quotations or attributed corpus rules. The fuller design chronology and source-use notes remain in `docs/design-journal.md`.

## Integrated Revision Verification, 27 September 2026

The historical checklist above is retained as an audit trail. The current
implementation and measured results are recorded at the top of the design
journal. Numerical tests check all 3,652 daily polygons, radial bounds, leap-day
inclusion, angle reversal, chronological smoothing and null preservation.
Browser tests passed for all seven numeric layers and three scales, ribbon
color equality with the daily scale, sports stripes and playoff inspection,
date input, both views/directions, SVG download, and 390/768/1440-pixel layouts.

Final independent review found three issues:

1. Export needed the active smoothing explanation, zero/missing keys, and full
   discrete intervals. These were added, along with sports-phase keys, month
   keys, source attribution, and a wrapped summary caption. Standalone export
   was visually checked as an SVG image; the revised download also passed the
   browser test.
2. Partially missing seasonal data could generate `NaN` coordinates. Contours
   now use explicit defined-point segments; ribbons skip either missing
   endpoint. A DOM-state regression with a single observed date verifies both
   partial and wholly missing cases, using the actual app renderer.
3. Compact rounded thresholds could be mistaken for exact class limits. The
   legend now explicitly labels range limits as approximate; exact inclusive/
   exclusive thresholds remain on hover. Classification never uses rounded
   display strings. This note also travels with the SVG export.

The same DOM-state regression verifies that changing data updates the date
readout even before the user pins a day. Escape clears the visual pin without
causing a stale readout. No external browser was automatically opened: that
tool's local-file navigation policy blocked the handoff, after local rendering
tests had already completed. The user can open `index.html` directly.

Known limits: weather is still gridded, the fog layer is a proxy, the EPA source
ends in 2024, and monthly/seasonal summaries use available observations rather
than a balanced complete-year sample. Numeric legends use approximate compact
labels, not full-precision typesetting. The contour's radius is locally scaled
to the seasonal range, not a zero-baseline quantitative area encoding. These
are explicit design/data choices rather than silently filled gaps.
