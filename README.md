# San Francisco, Day by Day

A local, static SVG app: one day per equal-area tile, one tropical year per
revolution. Open `index.html` directly in a browser. No build step, server,
account, external font, or live API call is required to view the app.

Live site: **https://spiral.infowetrust.com/**, served by GitHub Pages
from `infowetrust/spiral`. See [publishing instructions](docs/publishing.md).

The July prototype is preserved in `prototype-july-2026.html`. The revised page
uses `styles.css`, `core.js`, `app.js`, `export.js`, and local data snapshots. D3 7.9.0 and a
Lucide download icon are vendored under `vendor/`.

## Refresh Data

[Step-by-step data update guide](docs/updating-data.md): fetching, event research,
coverage checks, previewing, and publishing the refreshed snapshots.

Python 3.9+ and network access are required. The updater scripts use the standard
library and independently retain source metadata, actual coverage, and nulls.

```sh
python3 scripts/update-weather.py
python3 scripts/update-sports.py
python3 scripts/update-air.py
```

These commands refresh local files only. Review the results and commit/push them
to `main` to update the website. No automatic data-refresh schedule is configured.
For annual events, research and edit the curated edition records first, then run
`python3 scripts/build-events.py`; that command does not fetch new event dates.

Current page window: **27 Sep 2016 to 26 Sep 2026**, 3,652 days. Sports schedules
are verified through 26 Sep 2026; complete modeled weather days through
20 Sep 2026; the chosen EPA monitor series through 31 Dec 2024. All were
retrieved on 27 Sep 2026. These different cutoffs are visible in the page.

Temperature uses explicit ERA5-Land at the SF land cell (37.8, -122.4). The other
weather variables use a fixed nearest coastal ERA5 cell (37.75, -122.5); land
selection in that coarse model was rejected because it picked a cell across
the bay. Neither model resolves SF's neighborhood microclimates. This deliberate
source revision affects historical values as well as adding recent dates.

The page displays the trailing ten calendar years ending at the latest date
covered by its weather or sports snapshot. A slower dataset does not acquire
invented recent values: unavailable days are hatched. Every series is joined by
explicit date, never by array position across sources.

Each updater writes both JSON (analysis/provenance) and classic JavaScript
(offline browser loading). Reload the page after updating. Read the source notes
before comparing this revision with the older best-match weather snapshot:

- [Weather methods](docs/weather-sources.md)
- [Sports coverage](docs/sports-sources.md)
- [Air monitoring](docs/air-sources.md)
- [Annual events](docs/events-sources.md)
- [Design journal](docs/design-journal.md)
- [Prototype audit](docs/audit.md)

## Display Rules

- One turn = 365.24219 days. Jan 1 of the endpoint year anchors the top. Every
  local calendar date, including Feb 29, gets a full day's angle. Leap days are
  not inserted by squeezing other days. January boundaries nearly, but not
  exactly, realign after a typical four-year leap cycle.
- Radius squared grows linearly with time. Inner and outer boundaries are
  offset by half a turn, giving constant analytical area for every tile.
  The serialized SVG polygon approximates those curved boundaries.
- Counterclockwise mirrors angle and all month/summary labels. Age and data
  order remain unchanged. Newest dates always occupy the outside.
- Continuous weather palettes preserve the prototype's families. Skewed
  precipitation, wind-energy, and particulate distributions use a disclosed
  square-root scale. Temperature retains the prototype's 65 F color reference;
  this is not a heat threshold or climatological anomaly.
- Discrete legends name actual intervals, with units once. Equal-count bins
  preserve ties and may have unequal populations or fewer effective colors.
  Zeros are separate for nonnegative event metrics. Missing data is hatched.
- Daily smoothing averages data along time, not neighboring pixels or years.
  Centered 7/21-day windows require at least 80% of available window samples
  and a present center day; edge windows are truncated. Tooltips retain the raw
  value. Color domains are recomputed for the selected smoothing window. A
  raw-zero day can acquire color when its surrounding mean is positive; the
  legend says so. Turning smoothing off restores empty raw zeros.
- Seasonal summaries average each calendar month/day across covered years,
  omit Feb 29 only from this summary, then apply a circular 21-day mean. The
  365-day template closes exactly. The tiny difference from tropical phase is
  intentional. Summary radius spans its observed seasonal minimum/maximum,
  stated in the caption; it is not a zero-baseline area comparison.
- The gray polar contour is independent of color binning. The alternative
  ribbon encodes the same mean in width and uses the active daily color scale.
  Summary statistics are based on raw data, independent of daily smoothing.
- Non-temperature datasets default to a gray filled seasonal area. The dashed
  inner circle is zero; radial distance from it is linear in the seasonal mean.
  Temperature retains the range-scaled contour. Fill and outline share the same
  medium-light gray. Negative seasonal values, if present, extend inward.
- Sports cells contain team colors; diagonal stripes encode simultaneous
  teams. Black diamonds mark postseason, triangles mark play-in. Inspection
  lists every event, including doubleheaders. No smoothing for categories.
- Independent Warriors, Valkyries, and Giants checkboxes filter cells, overlap
  stripes, postseason markers, coverage, inspection, narrative counts, and the
  inner title. With no teams selected, all game marks are hidden.
- Annual events have independent switches, mnemonic emoji, and striped overlap
  cells. Full festival date spans are colored; parades occupy only parade day.
  Burning Man is explicitly out of town: its local relevance is the SF exodus,
  not a claim that it takes place here or a measurement of departures.
  Canceled and virtual editions are retained for inspection but not colored.
  The archive is curated and may have gaps; a blank day means no listed event.
  Event colors, dates, and provenance live in `data/events-*.json`. After editing
  those curated files, run `python3 scripts/build-events.py` to validate and
  regenerate the offline `events.json` / `events.js` snapshots.

The center text is generated from the included observations, not a model-written
claim about unseen data. Fog is a low-cloud/humidity proxy, not a visibility
observation. PM2.5 measures particles, not their source. Neither layer alone
proves a statement about all SF neighborhoods or a named wildfire.

## Downloads

The download button offers SVG or PNG and two scopes: the square wheel only,
or the whole current page including its sidebar and content below the fold.
Wheel PNGs are 2000 x 2000 pixels; full-page PNGs render at twice the current
CSS dimensions. SVGs retain vector cells, patterns, labels, and text without
external assets or HTML foreignObject elements. Open data details before
exporting to include their text. Tooltips and the download controls are omitted.

Legend labels use metric-specific decimal precision and grouped thousands,
not scientific notation. Positive precipitation below 0.01 inches is labeled
`<0.01`, not zero. Class boundaries gain decimals only when needed to distinguish
neighboring thresholds; full precision remains available on hover. Formatting
does not change the color scale or the underlying observations.

## Verification

```sh
node tests/core.test.cjs
node tests/render-state.cjs
node tests/events.cjs
python3 scripts/update-weather.py --self-test
```

`tests/browser.cjs` checks the app with Playwright and installed Google Chrome,
including all data modes,
legends, reversal, smoothing, sports patterns, SVG export, and narrow layouts.
It uses the bundled desktop Playwright runtime when available, or a local
`playwright` installation. Screenshots go to ignored `test-results/`.
The events suite additionally checks that only held editions receive color,
all eleven filters work, source links survive normalization, and event symbols
and overlap patterns work with reversal and image exports.

## Git Status at Revisit

On 27 September 2026, this folder had a Git repository but **no commits and no
remote**. The July page was untracked. That is not a Git backup. The archived
prototype in this folder is a local safety copy only. No commit or remote push
was requested or performed during the revision.

Publication update, 2 October 2026: the project now has a committed `main` branch
and a public remote backup at [infowetrust/spiral](https://github.com/infowetrust/spiral).
GitHub Pages is configured to serve the repository root at
`spiral.infowetrust.com`; initial DNS and HTTPS setup is tracked in the publishing
instructions. The earlier no-backup warning describes the September revisit,
not the current Git state.

Launch verified, 3 October 2026: the Bluehost CNAME resolves to GitHub Pages,
the custom-domain certificate is valid, and HTTP redirects to HTTPS. Data updates
remain manual; follow the [update guide](docs/updating-data.md).

## Attribution

Weather: Open-Meteo / ECMWF / Copernicus (see dataset notes, CC BY 4.0). Sports:
MLB schedule API and ESPN as documented. Air: US EPA monitoring data. Libraries:
D3 (ISC), Lucide (ISC). Dataset rights and upstream revisions are independent
of this app's source code.
