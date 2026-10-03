# San Francisco Weather Data: Sources and Audit

## Corrected Source Selection

**The previous all-ERA5 east-bay snapshot is superseded.** Explicit ERA5-Land
returns an SF land grid at **37.800003, -122.399994**, rather than the previous
east-bay ERA5 cell at 37.75, -122.25. Temperature now uses that SF land cell.
There is deliberately no single dataset-wide `returnedGrid`: location is
recorded in `metadata.metricSources` for every metric.

| Metric | Explicit model and selection | Returned grid | Meaning |
| --- | --- | --- | --- |
| `tempHigh` | `era5_land`, `land` | 37.800003, -122.399994 | SF land-cell temperature, approximately 0.1 degree grid |
| Auxiliary RH | `era5_land`, `land` | 37.800003, -122.399994 | SF land humidity, separately retained; not mixed into the coastal fog calculation |
| `windMax`, `windEnergy` | `era5`, `nearest` | 37.75, -122.50 | Coarse western-SF coastal wind, approximately 0.25 degree grid |
| `precipitation`, `solar` | `era5`, `nearest` | 37.75, -122.50 | Coarse western-SF coastal precipitation/radiation |
| `fogProxy` | `era5`, `nearest` | 37.75, -122.50 | RH, low cloud and weather code all from this same coastal cell |

**ERA5-Land is usable for temperature and RH through this API, but not for the
other requested variables.** A recorded 72-hour August 1-3, 2026 capability
query returned 72 valid temperature and RH samples each, and **zero** valid
wind, precipitation, solar, low-cloud or weather-code samples. This is an
Open-Meteo model-exposure limitation, not a claim that those fields do not exist
in the broader upstream ERA5-Land collection.

The documented model distinction supports using separate queries.
[Open-Meteo archive documentation](https://open-meteo.com/en/docs/historical-weather-api).
ERA5-Land replays the land model at finer resolution using ERA5 atmospheric
forcing; it is not an independent high-resolution atmospheric reanalysis.
[ECMWF ERA5-Land documentation](https://confluence.ecmwf.int/spaces/CKB/pages/140385202/ERA5-Land%2Bdata%2Bdocumentation).

### Reproducible Comparison

The updater records a native daily comparison for the last calendar month
before `--as-of`, August 2026 for this snapshot:

| Candidate | Returned coordinate | August 2026 mean daily high F | Wind/rain/solar availability |
| --- | --- | ---: | --- |
| ERA5-Land, land | 37.80, -122.40 | 71.38 | All null in this model |
| ERA5, nearest | 37.75, -122.50 | 65.42 | Available |
| ERA5, land (rejected) | 37.75, -122.25 | 74.74 | Available, but east-bay cell |
| ERA5-Seamless, land (not used) | 37.80, -122.40 | 71.38 | Exactly matches rejected east-bay daily wind/rain/solar |

The last result matters: **a seamless response's SF coordinate does not prove
that all its variables come from the SF land grid.** Separate explicit requests
make this distinction inspectable. Complete comparison responses, URLs and
hashes are retained under `metadata.requests`; `metadata.modelEvaluation`
summarizes the candidates and checks their exact daily-array agreement.

The coastal ERA5 cell is chosen by proximity to the requested SF point, not by
matching an expected temperature or Fogust pattern. It avoids the east-bay
cell, but is still coarse and marine-influenced. It is **not** a fine-resolution
central-SF land estimate for wind, rain or sunshine. ERA5-Land temperature is a
more geographically appropriate estimate, not a validated station observation.
No station-bias correction or ad hoc blending has been applied.

## Snapshot and Availability

Fetched on **2026-09-27 UTC**, with the requested environment date **2026-09-27**.
The exact start/completion times and HTTP server dates are in `data/weather.json`.
The dataset contains **3,652 consecutive local dates, 2016-09-21 through
2026-09-20 inclusive**: the trailing interval `(end minus 10 calendar years, end]`.

Actual API availability, not a nominal five-day lag, determines the endpoint:

- Both selected models have usable production inputs through
  **2026-09-21T23:00:00Z** in this snapshot.
- September 21 has only **17/24 instantaneous hours** and **16/24 preceding-hour
  accumulation intervals** available in `America/Los_Angeles`. Its daily metrics
  are therefore null, not estimated from that partial day.
- September 22-26 return no usable hours. September 27 is the current local day
  and is excluded. These dates are not appended as invented weather.
- Native daily cross-checks for each selected model confirm September 20 data
  and nulls on September 21-22. Returned responses remain in request provenance.

Availability is now **independent per metric**. The shared date window ends at
the latest day complete for **any** selected metric; another metric's incomplete
tail stays null. `metadata.availability.latestCompleteByMetric` records the
actual endpoints. All six happen to end on September 20 in this fetch; that is
measured, not imposed. No ERA5 temperature fills missing ERA5-Land temperature.

See `metadata.requests`: each request retains its complete URL, retrieval time,
HTTP Date, response SHA-256, and last non-null timestamps by input variable.
Requests also identify model, cell-selection policy, returned grid and source
ID. Trailing partial/null days and their coverage are preserved in
`metadata.availability.trailingDayEvidence`.

Requested point remains **37.7749, -122.4194**, target elevation **18 m**. Returned
elevation in production queries reflects that requested target, not proof of
native model terrain. The model/cell for each metric is fixed for the whole
decade, with no best-match stitching or forecast extension. Recent ERA5T and
ERA5-Land-T values are provisional and may change on final release.
An identical query later is not guaranteed to be byte-identical.
[ECMWF ERA5 time-series documentation](https://www.ecmwf.int/en/forecasts/datasets/era5-hourly-time-series-data-single-levels-1940-present).

## Daily Definitions

The updater requests UTC Unix hourly timestamps, then uses Python `zoneinfo`
to build actual midnight-to-midnight San Francisco days. It does not parse
ambiguous naive fall-back timestamps or impose 24-hour slices.

| Key | Daily definition | Output unit |
| --- | --- | --- |
| `tempHigh` | Maximum hourly instantaneous 2 m air temperature | F (`degF`) |
| `windMax` | Maximum hourly 10 m wind speed, m/s divided by 0.44704 | mph |
| `windEnergy` | Sum of `0.5 * 1.225 * v^3 * 1 hour`, with v in m/s | Wh/m2 per day |
| `precipitation` | Sum of hourly precipitation in mm, divided by 25.4 | inches |
| `solar` | Sum of hourly shortwave means in W/m2, multiplied by 0.0036 | MJ/m2 |
| `fogProxy` | Hours where `(RH >= 90 AND low cloud >= 80) OR WMO in {45,48}` | hours/day |

For wind energy, an instantaneous sample represents the following one-hour
interval (left-rectangle approximation). Fixed density is **1.225 kg/m3**. This
is kinetic energy passing through unit area normal to the wind, not extractable
turbine electricity or energy per unit ground area. Hourly samples omit
subhourly turbulence, and density varies in reality.
[DOE Small Wind Guidebook](https://www.energy.gov/cmei/systems/windexchange/small-wind-guidebook).

Precipitation and solar are **preceding-hour** quantities: each local day uses
interval endpoints from one hour after midnight through the next midnight,
including that final sample. Instantaneous metrics use timestamps from midnight
up to but excluding the next midnight. This avoids moving an accumulation
across midnight. Temperature and wind maxima are maxima of hourly modeled
samples, not station-record subhourly extremes or wind gusts.
[Official API schema](https://github.com/open-meteo/open-meteo/blob/main/openapi/historical-weather.yml).

The delivered window has **10 days of 23 hours, 3,632 days of 24 hours, and
10 days of 25 hours**. All six exported series have **3,652 valid daily values**.
That completeness is measured from hourly inputs, not manufactured by filling.

Any incomplete metric becomes JSON `null`; another metric on that day can still
be valid. No scaling of partial sums, interpolation, zero filling, or forecast
filling occurs. Genuine dry/calm/zero-proxy values remain zero. Fog uses
three-valued logic: known qualifying evidence can establish true, but unknown
evidence does not automatically mean false. For example, missing RH and cloud
with WMO 45 is true; missing all three inputs remains unknown.

`metadata.coverage` contains date-aligned expected hours, valid hours for each
metric and each input, known-positive proxy hours, and fog-code hours. The latter
two count known evidence only; consult coverage before treating zero as absence.
`metadata.inputSources` identifies each input's model-grid source. SF land RH
daily means and valid-hour counts are retained under
`metadata.auxiliary.relativeHumidity`, separate from the coastal ERA5 RH used
by fog. Missing land RH never falls back to coastal RH there, or vice versa.

## Monthly Evidence

`analysis.monthly` contains each calendar year-month, including partial first
and last September months. `analysis.calendarMonthMeans` pools all available
daily values by month number. Every metric has `mean`, `count`, and
`missingCount`; missing values are excluded, not treated as zero. Means are
daily-value means, including precipitation and solar, **not monthly totals**.

Snapshot pooled means below; counts are the same for all six metrics in this
complete snapshot. Later updates may have metric-specific coverage.

| Month | Days | High F | Max wind mph | Wind Wh/m2/day | Rain in/day | Solar MJ/m2/day | Proxy h/day |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Jan | 310 | 57.35 | 11.96 | 1427.39 | 0.1391 | 8.60 | 3.37 |
| Feb | 282 | 58.89 | 13.71 | 2074.58 | 0.1454 | 12.41 | 2.19 |
| Mar | 310 | 60.65 | 13.55 | 1662.53 | 0.1009 | 17.00 | 1.34 |
| Apr | 300 | 63.09 | 14.16 | 1825.76 | 0.0429 | 22.42 | 1.11 |
| May | 310 | 66.68 | 14.92 | 2152.25 | 0.0175 | 25.97 | 1.79 |
| Jun | 300 | 70.25 | 14.51 | 1878.92 | 0.0017 | 28.15 | 2.89 |
| Jul | 310 | 70.90 | 12.81 | 1230.53 | 0.0005 | 26.76 | 4.65 |
| Aug | 310 | 72.91 | 12.43 | 1022.57 | 0.0006 | 24.04 | 4.63 |
| Sep | 300 | 73.81 | 12.08 | 959.88 | 0.0036 | 20.05 | 3.23 |
| Oct | 310 | 71.18 | 11.15 | 815.84 | 0.0373 | 14.95 | 2.53 |
| Nov | 300 | 62.97 | 10.75 | 919.12 | 0.0760 | 10.22 | 2.70 |
| Dec | 310 | 57.10 | 11.56 | 1220.11 | 0.1400 | 7.60 | 3.81 |

For comparison, the superseded east-bay snapshot's pooled August and September
highs were **76.43 F and 77.49 F**; the SF land-cell values are now **72.91 F and
73.81 F**. These are ten-year pooled means, distinct from the August 2026-only
model comparison above. Coastal wind is stronger than at the rejected east-bay
cell, and the cubic energy calculation amplifies that location sensitivity.

### March 2026

All **31 days** actually returned complete hourly inputs. The mean daily high is
**70.332258 F**; the maximum is **81.9 F on March 20**. Three daily highs are at
least 80 F: March **17, 19, 20**. The nine earlier March means
in this window average **59.572043 F**, so March 2026 is about **10.76 F warmer**
by this specific metric. This is a within-model/window comparison, not proof of
an all-time San Francisco station record.

All 31 dated values and earlier March means are in `analysis.march2026`. Its
`nativeDailyCrossCheck` lists any differences against the independent native
daily request; the request and returned daily series are in `metadata.requests`.
**All 31 highs match ERA5-Land exactly** in this snapshot (zero mismatches).
The previously reported 74.43 F mean and 88.0 F maximum belonged to the rejected
east-bay ERA5 cell and must not be used as the SF land-series evidence.

### Fogust Limitations

At the newly selected coastal ERA5 cell, August averages **4.625806 proxy
hours/day (310 days)**, narrowly behind July **4.651613**. It does not show an
August maximum, and it must not be adjusted to manufacture one. The superseded
east-bay proxy ranked December first; this change illustrates the large
location sensitivity, not validation of the new proxy against observed fog.

Humidity plus low cloud is not a visibility measurement. Low stratus may remain
above the surface; fog requires ground contact. Wet winter weather can satisfy
these thresholds too. A 25 km grid cannot resolve the Sunset, downtown, coastal
terrain or marine-layer penetration. Threshold choice, model cloud physics,
instantaneous hourly sampling and the coarse coastal grid all affect the result.
[NWS marine-layer explanation](https://www.weather.gov/source/zhu/ZHU_Training_Page/clouds/stratus_form_dissipate/Marine_Layer.html).

No WMO 45/48 hours occur in this fetched window. Open-Meteo describes its weather
code as calculated rather than a station report; a zero code count is not
evidence that SF had no fog. In this snapshot, all positive proxy hours therefore
come from the RH/cloud branch. Calling this series simply "fog" would overstate
the evidence. "Fog / marine-layer proxy" is the appropriate label.

## Original Embedded WEATHER_DATA Audit

Initial `index.html` SHA-256:
`31299a56802bdb6e64ae5fdd896c22395605736e625c181382529a8a6db25da6`.
This task does not write to `index.html` or change its consumer code.
During this task, an independent workspace process replaced the page. The final
updater run therefore reports no embedded literal in its current-page audit;
the original audit below records the initial bytes, not the replacement page.

- Embedded dates are **2016-07-09 through 2026-07-09 inclusive**, with **3,653**
  values in every array. That includes both anniversary endpoints, one more
  day than the trailing ten-year interval convention adopted here.
- Its URL omits `models`, and its provider label explicitly says best-match.
  Its returned grid is **37.785587, -122.40964**, not either explicit grid used here.
  Differences from the new values cannot be attributed solely to new dates.
- None of its seven arrays contains a null. Precipitation has **2,860 zeros**,
  the proxy **2,175 zeros**, and fog-code hours **3,653 zeros**. These are counts
  of stored values, not proof that every source hour was available.
- No fetch timestamp, source response hashes, explicit dates array or hourly
  coverage is supplied. There are no raw hourly inputs to verify the derived
  series. Its wind-energy explanation explicitly says "over 24 hours";
  DST-aware integration cannot be established from the artifact.
- The original values are not declared fabricated: its provenance is
  insufficient to verify original retrieval-time availability or reproduce
  its exact derivations. This update instead fetches and records new evidence.

## Reproduction and Files

Python **3.9+**, internet access, and system IANA timezone data are required;
the program uses only the Python standard library. On this Mac no packages are
needed. Run from the repository root:

```sh
python3 scripts/update-weather.py --self-test
python3 scripts/update-weather.py --as-of 2026-09-27
```

For subsequent refreshes, omit `--as-of`. To repeat the exact date window later,
add `--end 2026-09-20`; revised upstream values can still change the numbers.
The fixed-date command above rechecks current source availability within its
date ceiling, rather than pretending to recreate an unavailable historical API
snapshot. The saved fetched files preserve this particular snapshot.

The updater retries transient API/network errors and validates units, hourly
spacing, array lengths, grid consistency, and finite values. It aborts before
writing datasets when fetching or validation fails. `--self-test` makes no
network requests and writes nothing; it exits nonzero on a failed test.
Verification completed: six offline tests passed, all 3,652 dates are consecutive,
all value/coverage arrays align, monthly counts sum to the dataset coverage,
and all production requests use only the intended explicit ERA5-Land/ERA5 cells.
The **32 recorded requests** also include clearly labeled rejected-candidate
evaluation queries, which do not supply production values. Executing the classic
JS in a JavaScript VM yields exactly the JSON payload. No server-side loading
or browser fetch is used by that file.
Independent live re-fetches for **2026-03-08 (23 hours)** and
**2025-11-02 (25 hours)** also reproduce the exported coastal wind-energy and
fog-proxy totals exactly.

Owned paths:

- `scripts/update-weather.py`: fetch, audit,
  aggregation, analysis, and offline regression tests.
- `data/weather.json`: fetched/derived snapshot,
  metadata, coverage, request provenance, and analysis.
- `data/weather.js`: identical JSON payload in
  `window.SF_WEATHER=...;`, with no module, fetch, server or dependency required.
- `docs/weather-sources.md`: this snapshot report.

For a consumer's later integration, a classic
`<script src="data/weather.js"></script>` works under `file://`; access the
date-aligned arrays through `window.SF_WEATHER`. This task deliberately does not
insert that script into the existing page. Consumers must handle nulls and use
the explicit dates, not the old hard-coded date interval.

Data attribution: Open-Meteo, using Copernicus C3S / ECMWF ERA5-Land and ERA5. Open-Meteo data
is offered under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
