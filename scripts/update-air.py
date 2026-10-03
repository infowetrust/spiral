#!/usr/bin/env python3
"""Build SF PM2.5 data from EPA AirData using only the Python standard library."""

import argparse
import calendar
from collections import Counter, defaultdict
import csv
from datetime import date, datetime, timedelta, timezone
import hashlib
import io
import json
import math
from pathlib import Path
import statistics
import sys
import tempfile
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
import zipfile


ROOT = Path(__file__).resolve().parents[1]
BASE = "https://aqs.epa.gov/aqsweb/airdata/"
FORMAT_URL = BASE + "FileFormats.html"
ADVISORY_URL = BASE + "Data_Advisory_PM25_88101_Pregen_Files.pdf"
CONTEXT_URL = "https://annualreport.baaqmd.gov/2018/2018_BAAQMD_Annual_Report.pdf"
CONTEXT_2020_URL = ("https://www.baaqmd.gov/~/media/files/communications-and-outreach/"
                    "publications/news-releases/2020/sta_200911_2020_064-pdf.pdf")
PM_BASICS_URL = "https://www.epa.gov/pm-pollution/particulate-matter-pm-basics"
SELECTION = {
    "State Code": "06", "County Code": "075", "Site Num": "0005",
    "Parameter Code": "88101", "POC": "3", "Sample Duration": "1 HOUR",
    "Pollutant Standard": "",
}
EVENTS = {"None", "No Events", "Events Included"}
UNITS = "Micrograms/cubic meter (LC)"
DAY = timedelta(days=1)


def now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def fetch_year(year, cache, offline):
    name = f"daily_88101_{year}.zip"
    url = BASE + name
    archive = cache / name
    manifest = cache / (name + ".json")
    if offline:
        provenance = json.loads(manifest.read_text())
        if provenance["status"] == "not-published":
            return None, provenance
        data = archive.read_bytes()
        if hashlib.sha256(data).hexdigest() != provenance["sha256"]:
            raise ValueError(f"Cache checksum mismatch: {archive}")
        return data, provenance
    for attempt in range(3):
        try:
            request = Request(url, headers={"User-Agent": "SF-time-airdata/1.0"})
            with urlopen(request, timeout=180) as response:
                data = response.read()
                provenance = {
                    "year": year, "url": url, "status": "downloaded",
                    "fetchedAt": now(), "lastModified": response.headers.get("Last-Modified"),
                    "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(),
                }
            with zipfile.ZipFile(io.BytesIO(data)) as zipped:
                if zipped.namelist() != [f"daily_88101_{year}.csv"]:
                    raise ValueError(f"Unexpected archive contents: {url}")
            archive.write_bytes(data)
            manifest.write_text(json.dumps(provenance, indent=2) + "\n")
            return data, provenance
        except HTTPError as error:
            if error.code in (404, 410):
                provenance = {"year": year, "url": url, "status": "not-published",
                              "httpStatus": error.code, "fetchedAt": now()}
                manifest.write_text(json.dumps(provenance, indent=2) + "\n")
                return None, provenance
            if error.code < 500 and error.code != 429:
                raise
            if attempt == 2:
                raise
        except (URLError, TimeoutError):
            if attempt == 2:
                raise
        time.sleep(2 ** attempt)
    raise RuntimeError(f"Download failed: {url}")


def extract(data, year, as_of):
    """Use one hourly-summary record per day, never the regulatory-exclusion row."""
    grouped = defaultdict(list)
    county_rows = 0
    county_latest = None
    with zipfile.ZipFile(io.BytesIO(data)) as zipped:
        with zipped.open(f"daily_88101_{year}.csv") as source:
            reader = csv.reader(io.TextIOWrapper(source, encoding="utf-8-sig"))
            header = next(reader, [])
            required = set(SELECTION) | {"Date Local", "Arithmetic Mean", "Event Type",
                       "Observation Count", "Units of Measure", "Method Code", "Method Name",
                       "Latitude", "Longitude", "Date of Last Change"}
            if not required.issubset(header):
                raise ValueError(f"Unexpected CSV schema in {year}")
            state_index, county_index = header.index("State Code"), header.index("County Code")
            for fields in reader:
                if len(fields) != len(header):
                    raise ValueError(f"Malformed CSV record in {year}")
                if fields[state_index] != "06" or fields[county_index] != "075":
                    continue
                row = dict(zip(header, fields))
                county_rows += 1
                county_latest = max(county_latest or "", row["Date Local"])
                if not all(row[key] == value for key, value in SELECTION.items()):
                    continue
                local_date = date.fromisoformat(row["Date Local"])
                if local_date.year != year:
                    raise ValueError(f"Wrong year in {year}: {local_date}")
                if local_date > as_of or row["Event Type"] not in EVENTS:
                    continue
                if row["Units of Measure"] != UNITS:
                    raise ValueError(f"Unexpected concentration units: {row['Units of Measure']}")
                grouped[local_date].append(row)
    accepted = {}
    rejected = []
    for day, rows in grouped.items():
        # Original T640/T640X values must not compete with aligned replacement data.
        corrected = {r["Method Code"] for r in rows}
        rows = [r for r in rows if not (
            (r["Method Code"] == "236" and corrected & {"636", "736"}) or
            (r["Method Code"] == "238" and corrected & {"638", "738"}))]
        if any(r["Event Type"] == "Events Included" for r in rows):
            rows = [r for r in rows if r["Event Type"] == "Events Included"]
        signatures = {(r["Arithmetic Mean"], r["Observation Count"], r["Method Code"])
                      for r in rows}
        if len(signatures) != 1:
            raise ValueError(f"Conflicting daily summaries: {day}; manual review required")
        row = max(rows, key=lambda r: r["Date of Last Change"])
        count = int(row["Observation Count"])
        value = float(row["Arithmetic Mean"])
        if not math.isfinite(value) or not 0 <= count <= 24:
            raise ValueError(f"Invalid daily observation: {day}")
        if count < 18:
            rejected.append(day.isoformat())
            continue
        accepted[day] = row
    return accepted, {
        "countyRows": county_rows, "countyLatestDate": county_latest,
        "selectedDailyRows": len(grouped), "acceptedDays": len(accepted),
        "lowObservationDates": sorted(rejected),
    }


def summarize(pairs):
    if not pairs:
        return {"observedDays": 0, "mean": None, "median": None, "peak": None}
    values = [value for _, value in pairs]
    peak = sorted(pairs, key=lambda pair: (-pair[1], pair[0]))[0]
    return {"observedDays": len(values), "mean": round(statistics.mean(values), 3),
            "median": round(statistics.median(values), 3),
            "peak": {"date": peak[0], "value": peak[1]}}


def build(args, cache):
    all_rows, archives = {}, []
    end = start = None
    for year in range(args.as_of.year, 1989, -1):
        if start and year < start.year:
            break
        print(f"{'Reading cache' if args.offline else 'Downloading'} {year}...", flush=True)
        data, provenance = fetch_year(year, cache, args.offline)
        if data is None:
            if start:
                raise ValueError(f"Required historical archive missing: {year}")
            archives.append(provenance)
            continue
        rows, coverage = extract(data, year, args.as_of)
        archives.append({**provenance, **coverage})
        all_rows.update(rows)
        print(f"  SF county rows: {coverage['countyRows']}; accepted days: {len(rows)}", flush=True)
        if end is None and rows:
            end = max(rows)
            prior_year = end.year - args.years
            start = date(prior_year, end.month,
                         min(end.day, calendar.monthrange(prior_year, end.month)[1])) + DAY
    if end is None:
        raise ValueError("No usable records found; existing outputs left unchanged")
    dates = [(start + i * DAY).isoformat() for i in range((end - start).days + 1)]
    rows = {day.isoformat(): row for day, row in all_rows.items() if start <= day <= end}
    values = [float(rows[day]["Arithmetic Mean"]) if day in rows else None for day in dates]
    pairs = [(day, value) for day, value in zip(dates, values) if value is not None]
    annual, monthly = {}, {}
    for year in range(start.year, end.year + 1):
        subset = [(d, v) for d, v in pairs if d.startswith(str(year))]
        slots = sum(d.startswith(str(year)) for d in dates)
        annual[str(year)] = {**summarize(subset), "calendarDaysInWindow": slots,
                             "missingDays": slots - len(subset)}
    for month in range(1, 13):
        monthly[f"{month:02}"] = summarize([(d, v) for d, v in pairs if int(d[5:7]) == month])
    seasons = {name: summarize([(d, v) for d, v in pairs if int(d[5:7]) in months])
               for name, months in {"DJF": (12, 1, 2), "MAM": (3, 4, 5),
                                    "JJA": (6, 7, 8), "SON": (9, 10, 11)}.items()}
    methods = {}
    for code in sorted({row["Method Code"] for row in rows.values()}):
        method_rows = [(d, r) for d, r in rows.items() if r["Method Code"] == code]
        methods[code] = {"name": method_rows[0][1]["Method Name"],
                         "days": len(method_rows), "first": min(d for d, _ in method_rows),
                         "last": max(d for d, _ in method_rows)}
    metadata = {
        "asOf": args.as_of.isoformat(), "generatedAt": now(), "windowYears": args.years,
        "windowRule": "Trailing calendar years ending at the latest accepted observation",
        "site": {"aqsId": "06-075-0005", "name": "San Francisco - Arkansas Street",
                 "address": "10 ARKANSAS ST.", "state": "06", "county": "075", "poc": "3",
                 "coordinatesReported": sorted({(float(r["Latitude"]), float(r["Longitude"]))
                                                 for r in rows.values()})},
        "parameter": "88101", "sourceUnits": UNITS,
        "statistic": "Arithmetic Mean from the 1 HOUR daily summary (not a daily maximum or AQI)",
        "dateBasis": "EPA Date Local: local standard time, midnight to midnight (PST, UTC-08)",
        "minimumHourlyObservations": 18, "eventPolicy": "Keep None/No Events/Events Included; never event-excluded summaries",
        "missingPolicy": "Explicit nulls; no interpolation, zero substitution, monitor fallback, or extrapolation",
        "negativeValuePolicy": "Retain finite source-reported values; no clipping",
        "interpretation": "Total measured PM2.5 from all sources, not a source-specific wildfire-smoke measure. No health interpretation.",
        "observedDays": len(pairs), "calendarDays": len(dates),
        "missingDays": len(dates) - len(pairs), "missingDates": [d for d, v in zip(dates, values) if v is None],
        "unavailableLatestPeriod": {"start": (end + DAY).isoformat(), "end": args.as_of.isoformat(),
                                    "days": (args.as_of - end).days} if end < args.as_of else None,
        "methods": methods, "eventTypeCounts": dict(Counter(r["Event Type"] for r in rows.values())),
        "observationCountByDate": [int(rows[d]["Observation Count"]) if d in rows else None for d in dates],
        "methodCodeByDate": [rows[d]["Method Code"] if d in rows else None for d in dates],
        "archives": archives, "annual": annual, "monthly": monthly, "seasons": seasons,
        "topDays": [{"date": d, "value": v} for d, v in sorted(pairs, key=lambda p: (-p[1], p[0]))[:20]],
        "summaryNote": "Means and medians use observed days only; incomplete years and uneven seasonal coverage are not normalized. Peaks are not smoke attribution.",
    }
    sources = [{"title": "EPA AirData pre-generated files", "url": BASE + "download_files.html"},
               {"title": "EPA daily file definitions", "url": FORMAT_URL},
               {"title": "EPA PM2.5 method advisory", "url": ADVISORY_URL},
               {"title": "Air District 2018 annual report: wildfire context", "url": CONTEXT_URL},
               {"title": "Air District September 11, 2020 wildfire-smoke release", "url": CONTEXT_2020_URL},
               {"title": "EPA particulate matter basics and sources", "url": PM_BASICS_URL}]
    sources += [{"title": f"EPA daily PM2.5 {a['year']}", "url": a["url"]} for a in archives]
    return {"fetchedAt": max(a["fetchedAt"] for a in archives), "start": start.isoformat(),
            "end": end.isoformat(), "dates": dates, "values": values, "unit": "ug/m3",
            "label": "San Francisco daily PM2.5 - Arkansas Street", "sources": sources,
            "metadata": metadata}


def documentation(payload):
    m = payload["metadata"]
    lines = ["# San Francisco daily PM2.5", "",
        "Generated by `scripts/update-air.py`; the updater owns this document and both data files.", "",
        "## Coverage", "",
        f"- Retrieved: {payload['fetchedAt']}; requested availability through {m['asOf']}.",
        f"- Actual series: **{payload['start']} to {payload['end']}**, {m['windowYears']} trailing calendar years.",
        f"- {m['observedDays']:,} observed days / {m['calendarDays']:,} calendar days; {m['missingDays']:,} explicit nulls.",
        "- Latest means latest accepted record in the downloaded parameter 88101 archives, not latest anywhere or real-time air quality.",
        "- EPA publication dates, HTTP Last-Modified dates, record revision dates, and observation dates are different.", ""]
    if m["unavailableLatestPeriod"]:
        gap = m["unavailableLatestPeriod"]
        lines += [f"**No values supplied for {gap['start']} through {gap['end']} ({gap['days']} days).**",
                  "This unobserved tail is recorded in metadata, not appended as invented measurements.", ""]
    lines += ["## Metric And Selection", "",
        "Fixed AQS site **06-075-0005**, San Francisco, 10 Arkansas Street; fixed instrument identifier **POC 3**, parameter **88101**.",
        "The label is particulate pollution, not smoke concentration. This is one monitoring location, not a citywide spatial average.", "",
        "Use the daily `Arithmetic Mean` for `Sample Duration = 1 HOUR` and blank `Pollutant Standard`.",
        "Each source row already summarizes that day's hourly samples; it is not an individual hourly reading.",
        "Require at least 18 of 24 hourly observations as this project's completeness filter. Preserve source numeric precision.",
        "Units are micrograms per cubic meter at local conditions (`ug/m3`). Dates follow EPA local standard days (PST, not daylight-saving civil days).", "",
        "Retain event-inclusive summaries and do not remove exceptional-event observations. `None` is an EPA summary flag, not proof that wildfire smoke was absent.",
        "Do not average duplicate durations, standards, instruments, or event-included/excluded summaries. Conflicting rows fail the update.",
        "Where applicable, prefer aligned T640/T640X replacement methods over original methods, per EPA's advisory; the actual methods used are listed below.",
        "Missing or low-completeness days are null, never zero-filled or interpolated. Finite negative source values are not clipped. There is no fallback to a different site or county AQI.", "",
        "### Methods In This Extract", ""]
    for code, method in m["methods"].items():
        lines.append(f"- {code}: {method['name']}; {method['first']} to {method['last']}; {method['days']} accepted days.")
    lines += ["", "## Availability Checks", "",
              "All listed archives were actually downloaded (or explicitly returned HTTP 404/410). Zero county rows is distinct from a failed request.",
              "Network errors and malformed data abort without publishing a partial replacement. Archive hashes, fetch timestamps, HTTP Last-Modified, and rejected dates are in JSON metadata.", "",
              "| Archive year | Status | SF county rows | Accepted days | Latest county date |",
              "| --- | --- | ---: | ---: | --- |"]
    for a in m["archives"]:
        lines.append(f"| [{a['year']}]({a['url']}) | {a['status']} | {a.get('countyRows', '-')} | {a.get('acceptedDays', '-')} | {a.get('countyLatestDate') or '-'} |")
    lines += ["", "## Annual Coverage And Peaks", "",
              "Peaks and summaries below are computed from accepted observations, not assigned to fires by this script.", "",
              "| Year | Observed / calendar days | Mean (ug/m3) | Peak date | Peak (ug/m3) |",
              "| --- | ---: | ---: | --- | ---: |"]
    for year, a in m["annual"].items():
        peak = a["peak"] or {"date": "-", "value": "-"}
        lines.append(f"| {year} | {a['observedDays']} / {a['calendarDaysInWindow']} | {a['mean']} | {peak['date']} | {peak['value']} |")
    lines += ["", "### Ten Largest Daily Means", "",
              "| Date | PM2.5 (ug/m3) |", "| --- | ---: |"]
    lines += [f"| {p['date']} | {p['value']} |" for p in m["topDays"][:10]]
    lines += ["", "## Seasonal Summary", "",
              "Meteorological seasons pooled across the extract; mean and median use available daily observations only. Missing days can bias comparisons. These are particulate-pollution seasons, not a classified smoke calendar.", "",
              "| Season | Observed days | Mean (ug/m3) | Median (ug/m3) | Peak date |",
              "| --- | ---: | ---: | ---: | --- |"]
    for season, s in m["seasons"].items():
        lines.append(f"| {season} | {s['observedDays']} | {s['mean']} | {s['median']} | {(s['peak'] or {}).get('date', '-')} |")
    lines += ["", "Month-level summaries, the 20 highest days, daily observation counts, missing dates, and yearly coverage are also in `metadata`.", "",
        "## Interpretation And Official Context", "",
        "PM2.5 captures fine particulate matter from multiple sources. Peaks can reveal periods consistent with wildfire-smoke episodes, but this dataset does not identify sources or estimate wildfire-attributable mass. No health claims or AQI categories are derived.", "",
        f"The [Air District's 2018 report]({CONTEXT_URL}) documents the November 2018 Camp Fire's prolonged Bay Area smoke impacts and the 2017 Napa fires. This supplies historical context, not a per-day attribution rule.",
        f"Its [September 11, 2020 release]({CONTEXT_2020_URL}) also documents Bay Area smoke from fires in California, Oregon, and Washington. The [EPA source overview]({PM_BASICS_URL}) explains that particles have multiple direct and atmospheric sources.",
        "No event label is inferred from a concentration threshold. Low readings at this site cannot establish absence of smoke elsewhere or aloft.", "",
        "## Reproduce", "", "Python 3.9+; standard library only; no credentials. Run from the repository root:", "", "```sh",
        f'python3 scripts/update-air.py --as-of {m["asOf"]} --cache-dir data/.cache/air',
        "```", "",
        "Omit `--as-of` to check through the current machine date. `--years` defaults to 10; the window ends at the latest accepted source observation. `--as-of` limits observation dates, not historical revision vintage.",
        "Online runs always refresh archives. EPA can revise historical records, so later downloads may differ. To replay retained downloaded bytes without fetching, use the same cache and `--offline`; hashes are checked and original fetch timestamps retained. `metadata.generatedAt` changes on replay.", "",
        "Without `--cache-dir`, downloads use a temporary directory that is deleted after the run. Keep an external cache for byte-for-byte source provenance. A cache is not an EPA archival-vintage service.", "",
        "Outputs: `data/air.json`, `data/air.js` (`window.SF_AIR = ...;`), and this document. No application files are changed. `dates` and `values` align; `start`/`end` bound the actual series. The JavaScript contains exactly the JSON payload.", "",
        "## Official Sources", ""]
    lines += [f"- [{s['title']}]({s['url']})" for s in payload["sources"] if not s["title"].startswith("EPA daily PM2.5 ")]
    return "\n".join(lines) + "\n"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--as-of", type=date.fromisoformat, default=date.today())
    parser.add_argument("--years", type=int, default=10)
    parser.add_argument("--cache-dir", type=Path)
    parser.add_argument("--offline", action="store_true")
    args = parser.parse_args()
    if not 1 <= args.years <= 30 or args.as_of.year - args.years < 1990:
        parser.error("Use 1-30 years and an as-of date allowing a window after 1989")
    if args.offline and not args.cache_dir:
        parser.error("--offline requires --cache-dir")
    with tempfile.TemporaryDirectory(prefix="sf-airdata-") as temporary:
        cache = args.cache_dir or Path(temporary)
        cache.mkdir(parents=True, exist_ok=True)
        payload = build(args, cache)
        encoded = json.dumps(payload, indent=2, ensure_ascii=True, allow_nan=False) + "\n"
        doc = documentation(payload)
        (ROOT / "data").mkdir(exist_ok=True)
        (ROOT / "docs").mkdir(exist_ok=True)
        (ROOT / "data/air.json").write_text(encoded, encoding="utf-8")
        (ROOT / "data/air.js").write_text("window.SF_AIR = " + encoded.rstrip() + ";\n", encoding="utf-8")
        (ROOT / "docs/air-sources.md").write_text(doc, encoding="utf-8")
        print(f"Wrote {payload['start']} through {payload['end']}: "
              f"{payload['metadata']['observedDays']} observations")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, zipfile.BadZipFile) as error:
        sys.exit(f"Air update failed: {error}")
