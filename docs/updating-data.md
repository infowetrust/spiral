# Updating the Data

The live site serves committed snapshots. It does not call weather, sports, or
EPA APIs in a visitor's browser, and no scheduled refresh is configured. Refresh
locally, review, test, then push to `main`. GitHub Pages publishes that commit.

## 1. Start From the Latest Version

Requirements: Git, Python 3.9+ with time-zone data, and internet access. The
acquisition scripts use Python's standard library; there are no API keys.
Node.js 18+ is needed for the tests. The browser tests use Playwright and Google
Chrome. Current Node.js LTS is recommended.

For a new checkout:

```sh
git clone git@github.com:infowetrust/spiral.git
cd spiral
```

For an existing checkout, run from the repository root:

```sh
git status --short
git pull --ff-only
```

Resolve or preserve existing local changes before updating. Do not discard a
previous snapshot simply because a provider is temporarily unavailable.

## 2. Refresh the Automatically Acquired Series

Run each command separately so that a failure is visible:

```sh
python3 scripts/update-weather.py
python3 scripts/update-sports.py
python3 scripts/update-air.py --cache-dir data/.cache/air
```

| Series | Source and update behavior | Files written |
| --- | --- | --- |
| Temperature, wind, wind energy, rain, solar radiation, fog proxy | Open-Meteo historical API using fixed ECMWF grid/model choices. Finds recent complete local days; historical reanalysis can lag today's date. Fetches a trailing ten-year interval. | `data/weather.json`, `data/weather.js` |
| Giants, Warriors, Valkyries | MLB schedule API and ESPN fallback/archives. Completed eligible SF home games only; current SF day is excluded. Coverage is tracked separately from game occurrence. | `data/sports.json`, `data/sports.js` |
| PM2.5 | EPA AirData annual archives, one selected SF monitor/instrument. Searches for published observations; the newest archive may be much older than the weather/sports cutoff. National archives can be large and slow. | `data/air.json`, `data/air.js`, `docs/air-sources.md` |

JSON holds the data and provenance. The matching `.js` file is the same snapshot
wrapped in a global variable so the app also works directly from `index.html`.
Always publish both files together; do not hand-edit only one.
Weather and sports source notes contain manually written snapshot statistics;
review and update those notes when the cutoff or counts change. The air updater
regenerates its source note automatically.

Optional reproducible cutoffs, replacing `YYYY-MM-DD` with a real date:

```sh
python3 scripts/update-weather.py --as-of YYYY-MM-DD
python3 scripts/update-sports.py --as-of YYYY-MM-DD
python3 scripts/update-air.py --as-of YYYY-MM-DD --cache-dir data/.cache/air
```

`--as-of` is a date ceiling, not a request to invent observations through that
date. Weather also supports `--end YYYY-MM-DD` to pin an available complete-day
endpoint. Sports supports explicit `--start` and `--end`, with the end strictly
before both the as-of date and actual SF today. Use `--help` on each script for
all options.

The air cache directory is Git-ignored. Normal runs download current archives
and overwrite the cache; it is not an incremental downloader. `--offline` with
the same cache directory reprocesses cached archives only, including their old
availability results, and does not discover newly published data.

### Check Failures and Coverage

- Read every script's final output and exit status. Sports can write a partial
  snapshot and then exit with status 1. A newly written file is not proof of a
  successful refresh. Inspect `coverage` for `partial` or `unavailable` records
  before deciding whether to publish.
- Do not convert missing observations or failed requests to zero. Empty sports
  dates and unavailable schedule partitions mean different things.
- Recent PM2.5 gaps may be genuine archive lag. Do not relabel them as clean air
  or change the monitor to get a newer date without revisiting the methodology.
- A failed run may have written some output files. Review the diff before retrying
  or publishing. Keep the last good committed version available.
- Review the visible "Data through" date and the source notes for every series.
  Changing providers, grids, units, or definitions is a methodological revision,
  not a routine refresh.

The app's visible ten-year window ends at the later of the weather and sports
snapshot endpoints. Air and events do not move that endpoint. Each dataset is
joined to that window by date; slower series can legitimately have gaps.

## 3. Maintain the Annual Events Calendar

This layer is researched, not automatically scraped. Running its bundler alone
does not add new editions or verify old ones.

Edit the appropriate curated JSON array:

- `data/events-races.json`: SF Marathon, Bay to Breakers, Big Wheel, Pride parade.
- `data/events-civic.json`: Chinese New Year parade, Fleet Week, Burning Man, Folsom.
- `data/events-festivals.json`: Carnaval, Outside Lands, Hardly Strictly Bluegrass.
- `data/events-catalog.json`: category names, emoji, colors, and descriptions.

Each edition requires `id`, `name`, inclusive ISO `start` and `end` dates,
`status` (`held`, `cancelled`, or `virtual`), and a primary HTTPS `source` URL.
Optional `sources` is an array of corroborating URLs with the primary URL first;
`note` records exceptions and interpretation. Follow the existing records.

Use dated organizer archives, official notices, results, or contemporary reporting.
Do not infer a historical date from a modern recurrence rule. Verify an event
occurred before marking it `held`; announced future events are not supported by
this observed-events layer. Canceled/virtual editions are inspectable but not
colored. Parade dates are not the whole celebration weekend. Fleet Week means
the festival span, not a claim that each scheduled flight took place. Burning
Man uses the official Nevada dates, not guessed SF travel days.

After researching an expanded range, update `reviewedAt`, `start`, and `end` in
the `snapshot` metadata in `scripts/build-events.py` to describe the actual
review. Do not advance the review date merely because the file was rebuilt.
Update the relevant `docs/events-*-notes.md` file with sources and unresolved gaps.
Then bundle:

```sh
python3 scripts/build-events.py
```

This validates the edition schema and generates `data/events.json` and
`data/events.js`. Commit the curated inputs, both generated files, metadata
changes, and research notes together. A blank event day means no listed event,
not a complete observation of city activity.

## 4. Validate and Preview

Offline checks:

```sh
python3 scripts/update-weather.py --self-test
python3 scripts/update-sports.py --self-test
python3 scripts/update-sports.py --validate
node tests/core.test.cjs
node tests/render-state.cjs
```

Browser checks require Playwright and installed Google Chrome. On a fresh machine:

```sh
npm install --no-save --package-lock=false playwright
node tests/browser.cjs
node tests/events.cjs
```

The tests open the local `index.html` by default. They also support an
`SF_TEST_URL` environment variable for a local server or the deployed site.
Generated screenshots/downloads stay in the ignored `test-results/` folder.
Core geometry tests deliberately retain a fixed historical fixture; browser year
labels and day counts follow the loaded window. The sports browser test includes
a historical 2022 NBA Finals fixture, which will need replacing if it eventually
falls outside the ten-year window. Event tests expect the current eleven categories
and substantial historical coverage; adding categories or moving the window far
beyond the archived editions requires revisiting those expectations.

Open `index.html` in a browser and inspect each refreshed dataset. Check latest
dates, missing-data hatching, units, tooltips, narratives, legends, and a download.
The scripts may change historical values as providers revise their archives.
Review any large shifts; do not assume all changed rows are new days.

## 5. Commit and Publish

Review the changes and updated coverage notes. Then stage only intended files:

```sh
git diff --stat
git diff -- docs
git add data docs
git diff --cached --stat
git commit -m "Refresh SF data snapshots"
git push origin main
```

If the event metadata in `scripts/build-events.py` changed, stage that file too
before committing. Do not commit raw-download caches, browser output, credentials,
or unrelated local changes. Large JSON diffs are normal but still deserve a
coverage/date-count check.

Watch [GitHub Actions](https://github.com/infowetrust/spiral/actions) for a successful
Pages deployment of the new commit. After it finishes, reload
https://spiral.infowetrust.com/ and confirm its dataset cutoffs match the new
snapshots. Browser/CDN caching can briefly retain old files.

Optional deployed-site checks:

```sh
SF_TEST_URL=https://spiral.infowetrust.com/ node tests/browser.cjs
SF_TEST_URL=https://spiral.infowetrust.com/ node tests/events.cjs
```

For a bad published refresh, prefer a reviewed `git revert` of the specific data
commit and push the resulting correction. Do not force-push or rewrite history
to remove an ordinary data-update mistake.
