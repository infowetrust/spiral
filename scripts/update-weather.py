#!/usr/bin/env python3
"""Fetch SF ERA5-Land temperature plus coastal ERA5 metrics; Python 3.9+ stdlib."""

import argparse
import calendar
import hashlib
import json
import math
import sys
import time
import unittest
from collections import Counter
from datetime import date, datetime, time as day_time, timedelta, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
UTC = timezone.utc
LOCAL = ZoneInfo("America/Los_Angeles")
API = "https://archive-api.open-meteo.com/v1/archive"
FIELDS = ("temperature_2m", "wind_speed_10m", "precipitation",
          "shortwave_radiation", "relative_humidity_2m", "cloud_cover_low",
          "weather_code")
KEYS = ("tempHigh", "windMax", "windEnergy", "precipitation", "solar", "fogProxy")
UNITS = dict(zip(KEYS, ("degF", "mph", "Wh/m2/day", "in", "MJ/m2", "hours/day")))
SOURCES = [
    {"name": "Open-Meteo Historical Weather API", "url": "https://open-meteo.com/en/docs/historical-weather-api",
     "models": ["era5_land", "era5"], "license": "CC BY 4.0", "role": "Separately queried explicit models; see per-metric provenance"},
    {"name": "Copernicus C3S / ECMWF ERA5-Land", "url": "https://confluence.ecmwf.int/spaces/CKB/pages/140385202/ERA5-Land%2Bdata%2Bdocumentation",
     "role": "SF land-cell temperature and auxiliary humidity; other requested variables unavailable through this API model"},
    {"name": "Copernicus C3S / ECMWF ERA5", "url": "https://www.ecmwf.int/en/forecasts/datasets/era5-hourly-time-series-data-single-levels-1940-present",
     "role": "Underlying reanalysis; recent ERA5T data can be revised"},
    {"name": "Open-Meteo official API schema", "url": "https://github.com/open-meteo/open-meteo/blob/main/openapi/historical-weather.yml"},
    {"name": "US Department of Energy Small Wind Guidebook", "url": "https://www.energy.gov/cmei/systems/windexchange/small-wind-guidebook",
     "role": "Wind kinetic power relationship, distinct from turbine electricity"},
    {"name": "NWS Marine Layer Information", "url": "https://www.weather.gov/source/zhu/ZHU_Training_Page/clouds/stratus_form_dissipate/Marine_Layer.html",
     "role": "Low stratus is not necessarily ground-contact fog"},
]


def stamp():
    return datetime.now(UTC).isoformat(timespec="seconds").replace("+00:00", "Z")


def days(start, end):
    for offset in range((end - start).days + 1):
        yield start + timedelta(days=offset)


def bounds(day):
    start = datetime.combine(day, day_time(), LOCAL).timestamp()
    end = datetime.combine(day + timedelta(days=1), day_time(), LOCAL).timestamp()
    return int(start), int(end)


def finite(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def fog(rh, cloud, code):
    # Three-valued Boolean logic: missing evidence is not a negative observation.
    wet = None if rh is None else rh >= 90
    cloudy = None if cloud is None else cloud >= 80
    both = False if wet is False or cloudy is False else (True if wet and cloudy else None)
    coded = None if code is None else code in (45, 48)
    if both is True or coded is True:
        return True
    if both is False and coded is False:
        return False
    return None


class Archive:
    def __init__(self, model, cell_selection, source_id, fields=FIELDS):
        self.requests = []
        self.grid = None
        self.model = model
        self.cell_selection = cell_selection
        self.source_id = source_id
        self.fields = fields

    def fetch(self, start, end, purpose, daily=False, fields=None):
        fields = fields or self.fields
        params = {"latitude": 37.7749, "longitude": -122.4194,
                  "start_date": start.isoformat(), "end_date": end.isoformat(),
                  "models": self.model, "cell_selection": self.cell_selection, "elevation": 18,
                  "temperature_unit": "fahrenheit", "wind_speed_unit": "ms",
                  "precipitation_unit": "mm", "timezone": "UTC", "timeformat": "unixtime"}
        if daily:
            params.update(timezone="America/Los_Angeles", timeformat="iso8601",
                          daily="temperature_2m_max,wind_speed_10m_max,precipitation_sum,shortwave_radiation_sum")
        else:
            params["hourly"] = ",".join(fields)
        url = API + "?" + urlencode(params)
        for attempt in range(5):
            try:
                with urlopen(Request(url, headers={"User-Agent": "SF-weather-reproducible/1.0"}), timeout=120) as response:
                    raw = response.read()
                    server_date = response.headers.get("Date")
                break
            except HTTPError as exc:
                if exc.code not in (429, 500, 502, 503, 504) or attempt == 4:
                    raise RuntimeError(f"API HTTP {exc.code}: {exc.read().decode()} URL: {url}") from exc
                time.sleep(5 * (2 ** attempt))
            except (URLError, TimeoutError):
                if attempt == 4:
                    raise
                time.sleep(5 * (2 ** attempt))
        data = json.loads(raw)
        if data.get("error"):
            raise RuntimeError(data)
        self.requests.append({"purpose": purpose, "sourceId": self.source_id,
                              "model": self.model, "cellSelection": self.cell_selection,
                              "url": url, "retrievedAt": stamp(),
                              "httpDate": server_date, "responseSha256": hashlib.sha256(raw).hexdigest()})
        grid = {key: data[key] for key in ("latitude", "longitude", "elevation")}
        if self.grid is not None and self.grid != grid:
            raise ValueError("Model grid changed between requests")
        self.grid = grid
        self.requests[-1]["returnedGrid"] = grid
        if daily:
            self.requests[-1]["dailyResponse"] = data["daily"]
            self.requests[-1]["dailyUnits"] = data["daily_units"]
            return data
        hourly = data["hourly"]
        units = data["hourly_units"]
        expected_units = dict(zip(FIELDS, ("\u00b0F", "m/s", "mm", "W/m\u00b2", "%", "%", "wmo code")))
        if any(units.get(key) != expected_units[key] for key in fields):
            raise ValueError(f"Unexpected units: {units}")
        times = hourly["time"]
        if any(b - a != 3600 for a, b in zip(times, times[1:])):
            raise ValueError("Non-hourly or duplicate UTC timestamps")
        if any(len(hourly[key]) != len(times) for key in fields):
            raise ValueError("Misaligned hourly arrays")
        rows = {}
        for i, timestamp in enumerate(times):
            row = tuple(hourly[key][i] if key in fields else None for key in FIELDS)
            if any(value is not None and not finite(value) for value in row):
                raise ValueError("Non-finite API value")
            if any(value is not None and value < 0 for value in row[1:]):
                raise ValueError("Negative wind, precipitation, radiation or categorical input")
            if any(value is not None and not 0 <= value <= 100 for value in row[4:6]):
                raise ValueError("Humidity/cloud percentage outside 0..100")
            rows[timestamp] = row
        self.requests[-1]["lastNonNullUtcByVariable"] = {
            key: next((datetime.fromtimestamp(t, UTC).isoformat() for t in reversed(times)
                       if rows[t][i] is not None), None) for i, key in enumerate(FIELDS) if key in fields}
        self.requests[-1]["hourlyCount"] = len(times)
        self.requests[-1]["validHoursByVariable"] = {
            key: sum(rows[t][i] is not None for t in times)
            for i, key in enumerate(FIELDS) if key in fields}
        return rows


def select_inputs(land, coastal):
    """Fixed per-variable sourcing; never fill missing land temperature with ERA5."""
    empty = (None,) * len(FIELDS)
    return {t: (land.get(t, empty)[0],) + coastal.get(t, empty)[1:]
            for t in land.keys() | coastal.keys()}


def latest_by_metric(records):
    return {key: max((d for d, vals in records if vals[key] is not None), default=None)
            for key in KEYS}


def source_metadata(api):
    return {"sourceId": api.source_id, "model": api.model,
            "cellSelection": api.cell_selection, "returnedGrid": api.grid,
            "requestedLocation": {"latitude": 37.7749, "longitude": -122.4194, "elevation": 18},
            "nominalResolution": "0.1 degrees (~11 km)" if api.model == "era5_land" else "0.25 degrees (~25 km)"}


def aggregate(rows, day):
    start, end = bounds(day)
    expected = (end - start) // 3600
    empty = (None,) * len(FIELDS)
    instantaneous = [rows.get(t, empty) for t in range(start, end, 3600)]
    # Accumulations/means describe the preceding hour, so use endpoints 01:00..24:00.
    accumulated = [rows.get(t, empty) for t in range(start + 3600, end + 1, 3600)]
    temp = [r[0] for r in instantaneous if r[0] is not None]
    wind = [r[1] for r in instantaneous if r[1] is not None]
    rain = [r[2] for r in accumulated if r[2] is not None]
    solar = [r[3] for r in accumulated if r[3] is not None]
    fog_values = [fog(*r[4:]) for r in instantaneous]
    known_fog = [v for v in fog_values if v is not None]
    counts = dict(zip(KEYS, (len(temp), len(wind), len(wind), len(rain), len(solar), len(known_fog))))
    values = {
        "tempHigh": max(temp) if len(temp) == expected else None,
        "windMax": round(max(wind) / 0.44704, 4) if len(wind) == expected else None,
        "windEnergy": round(math.fsum(0.5 * 1.225 * v ** 3 for v in wind), 6) if len(wind) == expected else None,
        "precipitation": round(math.fsum(rain) / 25.4, 6) if len(rain) == expected else None,
        "solar": round(math.fsum(solar) * 0.0036, 6) if len(solar) == expected else None,
        "fogProxy": sum(known_fog) if len(known_fog) == expected else None,
    }
    coverage = {"expectedHours": expected, "validHours": counts,
                "inputValidHours": {key: sum(r[i] is not None for r in
                                             (accumulated if i in (2, 3) else instantaneous))
                                    for i, key in enumerate(FIELDS)},
                "fogPositiveKnownHours": sum(known_fog),
                "fogCodeHours": sum(r[6] in (45, 48) for r in instantaneous)}
    return values, coverage


def stats(values):
    known = [v for v in values if v is not None]
    return {"mean": round(math.fsum(known) / len(known), 6) if known else None,
            "count": len(known), "missingCount": len(values) - len(known)}


def analyze(dates, values):
    def grouped(labels):
        return [{"period": label, "days": sum(d.startswith(label) for d in dates),
                 "values": {key: stats([v for d, v in zip(dates, array) if d.startswith(label)])
                            for key, array in values.items()}} for label in labels]
    monthly = grouped(sorted({d[:7] for d in dates}))
    seasonal = [{"month": m, "values": {
        key: stats([v for d, v in zip(dates, array) if int(d[5:7]) == m])
        for key, array in values.items()}} for m in range(1, 13)]
    march = [{"date": d, "tempHigh": v} for d, v in zip(dates, values["tempHigh"])
             if d.startswith("2026-03-")]
    known = [r for r in march if r["tempHigh"] is not None]
    summary = stats([r["tempHigh"] for r in march])
    summary.update(available=bool(known), expectedDays=31, daysInDataset=len(march),
                   complete=len(known) == 31, daily= march,
                   maximum=max((r["tempHigh"] for r in known), default=None))
    summary["maximumDates"] = [r["date"] for r in known if r["tempHigh"] == summary["maximum"]]
    summary["daysAtOrAbove80F"] = sum(r["tempHigh"] >= 80 for r in known) if known else None
    summary["otherMarches"] = [r for r in monthly if r["period"].endswith("-03") and r["period"] != "2026-03"]
    return {"monthly": monthly, "calendarMonthMeans": seasonal, "march2026": summary,
            "interpretation": "Means are unweighted means of non-null daily values, not monthly totals. Counts accompany every mean. March comparisons are within this grid/model/window, not station records.",
            "fogust": {"august": seasonal[7]["values"]["fogProxy"],
                        "rankingDescending": sorted(range(1, 13), key=lambda m: seasonal[m-1]["values"]["fogProxy"]["mean"] if seasonal[m-1]["values"]["fogProxy"]["mean"] is not None else -1, reverse=True),
                        "caution": "RH/cloud threshold proxy, not visibility or observed fog. Low cloud can remain above ground; moist winter storms can qualify. Coarse coastal grid and arbitrary thresholds cannot resolve SF neighborhoods or establish August as the foggiest month."}}


def audit_embedded():
    path = ROOT / "index.html"
    if not path.exists():
        return {"available": False}
    raw = path.read_bytes()
    audit = {"path": "index.html", "sha256": hashlib.sha256(raw).hexdigest()}
    marker = "const WEATHER_DATA = "
    if marker not in raw.decode():
        return dict(audit, available=False, reason="No original const WEATHER_DATA JSON literal")
    original = json.JSONDecoder().raw_decode(raw.decode().split(marker, 1)[1])[0]
    audit.update(available=True, start=original.get("start"), end=original.get("end"),
                 sourceUrl=original.get("source_url"), provider=original.get("provider"))
    audit["series"] = {key: {"count": len(array), "nullCount": array.count(None), "zeroCount": array.count(0)}
                       for key, array in original.items() if isinstance(array, list)}
    audit["limitations"] = ["Source URL does not select one explicit model.",
                            "No fetchedAt timestamp, explicit date array, hourly inputs or coverage counts.",
                            "Embedded wind-energy explanation assumes 24 hours; computation cannot be verified from this artifact.",
                            "Zero-only fog-code series does not establish absence of fog.",
                            "Non-null values alone do not prove availability at the time of the original fetch."]
    return audit


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--as-of", type=date.fromisoformat, help="Local date ceiling; defaults to today, never accepts a future date")
    parser.add_argument("--end", type=date.fromisoformat, help="Pin the ten-year window to this available complete day")
    parser.add_argument("--self-test", action="store_true", help="Run offline tests without fetching or writing")
    args = parser.parse_args()
    if args.self_test:
        result = unittest.main(argv=[sys.argv[0]], exit=False).result
        sys.exit(0 if result.wasSuccessful() else 1)
    today = datetime.now(LOCAL).date()
    as_of = args.as_of or today
    if as_of > today:
        parser.error("--as-of cannot be later than the actual local clock date")
    fetched_at = stamp()
    audit = audit_embedded()
    land = Archive("era5_land", "land", "sf_land", ("temperature_2m", "relative_humidity_2m"))
    coastal = Archive("era5", "nearest", "sf_coastal")
    rejected = Archive("era5", "land", "east_bay_rejected")
    seamless = Archive("era5_seamless", "land", "seamless_evaluation_only")
    apis = (land, coastal, rejected, seamless)
    evaluation_end = date(as_of.year, as_of.month, 1) - timedelta(days=1)
    evaluation_start = evaluation_end.replace(day=1)
    land.fetch(evaluation_start, evaluation_start + timedelta(days=2),
               "era5-land-variable-capability", fields=FIELDS)
    evaluations = []
    comparison_daily = {}
    for api in apis:
        comparison = api.fetch(evaluation_start, evaluation_end, "model-grid-evaluation", daily=True)
        comparison_daily[api.source_id] = comparison["daily"]
        evaluations.append({"sourceId": api.source_id, "model": api.model,
                            "cellSelection": api.cell_selection, "returnedGrid": api.grid,
                            "start": evaluation_start.isoformat(), "end": evaluation_end.isoformat(),
                            "dailyStatistics": {k: stats(v) for k, v in comparison["daily"].items() if k != "time"}})
    probe_end = as_of
    probe_evidence = []
    available_by_metric = {key: None for key in KEYS}
    for _ in range(12):
        probe_start = probe_end - timedelta(days=31)
        land_rows = land.fetch(probe_start, min(as_of, probe_end + timedelta(days=1)), "availability-probe")
        coastal_rows = coastal.fetch(probe_start, min(as_of, probe_end + timedelta(days=1)), "availability-probe")
        rows = select_inputs(land_rows, coastal_rows)
        for day in reversed(list(days(probe_start, min(probe_end, as_of - timedelta(days=1))))):
            vals, coverage = aggregate(rows, day)
            probe_evidence.append({"date": day.isoformat(), "values": vals, "coverage": coverage})
            for key in KEYS:
                if available_by_metric[key] is None and vals[key] is not None:
                    available_by_metric[key] = day
        if all(day is not None for day in available_by_metric.values()):
            break
        probe_end = probe_start - timedelta(days=1)
    available = [day for day in available_by_metric.values() if day is not None]
    if not available:
        raise RuntimeError("No complete metric-day found in 384-day search; no outputs written")
    available_end = max(available)
    end = available_end
    if args.end:
        if args.end > available_end:
            parser.error(f"--end exceeds latest complete local day {available_end}")
        if args.end.year < 1960:
            parser.error("--end must allow ten years within ERA5-Land availability (1950 onward)")
        end = args.end
    # The trailing interval is (end minus ten calendar years, end], inclusive dates.
    anniversary = end.replace(year=end.year - 10, day=min(end.day, calendar.monthrange(end.year - 10, end.month)[1]))
    start = anniversary + timedelta(days=1)
    print(f"Latest complete day for any metric {available_end}; fetching {start}..{end}", flush=True)
    print("Availability: " + str(available_by_metric), flush=True)
    dates = []
    values = {key: [] for key in KEYS}
    coverage_arrays = {"expectedHours": [], "validHours": {key: [] for key in KEYS},
                       "inputValidHours": {key: [] for key in FIELDS},
                       "fogPositiveKnownHours": [], "fogCodeHours": []}
    humidity = {"sourceId": "sf_land", "model": "era5_land", "units": "%",
                "dailyMean": [], "validHours": [],
                "usage": "Auxiliary SF land humidity; deliberately not combined with coastal ERA5 clouds in fogProxy."}
    chunk_start = start
    while chunk_start <= end:
        chunk_end = min(date(chunk_start.year, 12, 31), end)
        land_rows = land.fetch(chunk_start, chunk_end + timedelta(days=1), "dataset")
        coastal_rows = coastal.fetch(chunk_start, chunk_end + timedelta(days=1), "dataset")
        rows = select_inputs(land_rows, coastal_rows)
        for day in days(chunk_start, chunk_end):
            vals, cov = aggregate(rows, day)
            dates.append(day.isoformat())
            for key in KEYS:
                values[key].append(vals[key])
                coverage_arrays["validHours"][key].append(cov["validHours"][key])
            for key in FIELDS:
                coverage_arrays["inputValidHours"][key].append(cov["inputValidHours"][key])
            for key in ("expectedHours", "fogPositiveKnownHours", "fogCodeHours"):
                coverage_arrays[key].append(cov[key])
            day_start, day_end = bounds(day)
            rh = [land_rows.get(t, (None,) * len(FIELDS))[4] for t in range(day_start, day_end, 3600)]
            known_rh = [v for v in rh if v is not None]
            humidity["validHours"].append(len(known_rh))
            humidity["dailyMean"].append(round(math.fsum(known_rh) / len(known_rh), 6)
                                         if len(known_rh) == cov["expectedHours"] else None)
        print(f"Fetched through {chunk_end}", flush=True)
        chunk_start = chunk_end + timedelta(days=1)
        time.sleep(0.25)
    for api in (land, coastal):
        api.fetch(end, min(as_of - timedelta(days=1), end + timedelta(days=2)), "native-daily-cross-check", daily=True)
    march_check = None
    if start <= date(2026, 3, 1) and end >= date(2026, 3, 31):
        march_check = land.fetch(date(2026, 3, 1), date(2026, 3, 31), "march-2026-native-daily-cross-check", daily=True)
    if all(values[key][-1] is None for key in KEYS):
        raise RuntimeError("Availability changed while fetching; refusing inconsistent endpoint")
    source_grids = {api.source_id: source_metadata(api) for api in (land, coastal)}
    input_map = {"tempHigh": ["temperature_2m"], "windMax": ["wind_speed_10m"],
                 "windEnergy": ["wind_speed_10m"], "precipitation": ["precipitation"],
                 "solar": ["shortwave_radiation"],
                 "fogProxy": ["relative_humidity_2m", "cloud_cover_low", "weather_code"]}
    latest_in_dataset = latest_by_metric(list(zip(dates, [dict(zip(KEYS, row)) for row in zip(*(values[k] for k in KEYS))])))
    metric_sources = {key: dict(source_grids["sf_land" if key == "tempHigh" else "sf_coastal"],
                                inputVariables=input_map[key], latestCompleteDate=latest_in_dataset[key])
                      for key in KEYS}
    requests = sorted((r for api in apis for r in api.requests), key=lambda r: r["retrievedAt"])
    output = {"fetchedAt": fetched_at, "start": start.isoformat(), "end": end.isoformat(),
              "dates": dates, "units": UNITS, "values": values, "sources": SOURCES,
              "metadata": {"schemaVersion": 2, "fetchCompletedAt": stamp(), "asOf": as_of.isoformat(),
                           "model": "explicit per-metric ERA5-Land + coastal ERA5", "timezone": LOCAL.key,
                           "scriptSha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                           "pinnedEnd": args.end.isoformat() if args.end else None,
                           "requestedLocation": {"latitude": 37.7749, "longitude": -122.4194, "elevation": 18},
                           "sourceGrids": source_grids, "metricSources": metric_sources,
                           "inputSources": {key: "sf_land" if key == "temperature_2m" else "sf_coastal" for key in FIELDS},
                           "auxiliary": {"relativeHumidity": dict(humidity, returnedGrid=land.grid)},
                           "modelEvaluation": {"candidates": evaluations,
                                               "selection": "ERA5-Land SF land temperature; nearest western-SF coastal ERA5 for unavailable land-model metrics. Fog uses only co-located coastal ERA5 inputs. Models/cells fixed for entire window; no temporal model stitching.",
                                               "seamlessMatchesEastBayVariables": [key for key in ("wind_speed_10m_max", "precipitation_sum", "shortwave_radiation_sum")
                                                                                   if comparison_daily["seamless_evaluation_only"][key] == comparison_daily["east_bay_rejected"][key]],
                                               "rejectedSeamless": "One returned location does not identify separate component grids. Explicitly separated queries used instead; comparison above records actual component agreement."},
                           "window": "(latest complete day for ANY metric minus ten calendar years, that day]; independently unavailable metrics remain null; no forecast extension",
                           "availability": {"latestCompleteLocalDayAnyMetric": available_end.isoformat(),
                                            "latestCompleteByMetric": {key: day.isoformat() if day else None for key, day in available_by_metric.items()},
                                            "trailingDayEvidence": sorted([r for r in probe_evidence if r["date"] >= min(available).isoformat()], key=lambda r: r["date"]),
                                            "currentLocalDayExcluded": as_of.isoformat()},
                           "methods": {"daily": "Per-metric explicit ERA5-Land / ERA5 UTC hourly values aggregated over local civil days, not fixed 24-hour bins. Refer to metricSources for model and location.",
                                       "tempHigh": "Maximum of hourly instantaneous 2 m temperature (degF); not subhourly station maximum.",
                                       "windMax": "Maximum hourly 10 m wind (m/s) divided by 0.44704; not gusts.",
                                       "windEnergy": "sum(0.5 * 1.225 kg/m3 * wind_m_s^3 * 1 hour); left-rectangle integration of instantaneous samples; Wh/m2 for each actual 23/24/25-hour day; not turbine electricity.",
                                       "precipitation": "Sum preceding-hour precipitation at local interval endpoints (01:00 through next midnight), mm / 25.4 = inches.",
                                       "solar": "Sum preceding-hour shortwave radiation means at interval endpoints, W/m2 * 3600 / 1e6 = MJ/m2.",
                                       "fogProxy": "Hours satisfying ((RH >= 90%) AND (low cloud >= 80%)) OR WMO code 45/48, all from the same coastal ERA5 cell; three-valued logic with unknown inputs.",
                                       "missing": "Any insufficiently covered daily metric is null; no partial sum, scaling, interpolation, zero fill or forecast fill. Other complete metrics on that day remain valid."},
                           "coverage": coverage_arrays,
                           "coverageSummary": {key: stats(array) for key, array in values.items()},
                           "dayLengthCounts": dict(Counter(coverage_arrays["expectedHours"])),
                           "requests": requests, "embeddedAudit": audit,
                           "limitations": ["Temperature is SF land-cell reanalysis, not a station observation; coastal microclimates unresolved.",
                                           "Wind, energy, precipitation, solar and fog are coarse western-SF coastal ERA5 estimates, not ERA5-Land or central-SF observations.",
                                           "SF ERA5-Land humidity is retained separately; no mismatched-grid humidity/cloud fog calculation.",
                                           "Recent ERA5T and ERA5-Land-T values are provisional and may change on rerun.",
                                           "Hourly rounded API values limit precision; energy cubing magnifies wind error.",
                                           "Standard fixed density and sampled wind omit turbulence and variable density."]},
              "analysis": analyze(dates, values)}
    if march_check:
        reference = dict(zip(march_check["daily"]["time"], march_check["daily"]["temperature_2m_max"]))
        output["analysis"]["march2026"]["nativeDailyCrossCheck"] = {
            "sourceId": "sf_land", "model": "era5_land", "returnedGrid": land.grid,
            "requestPurpose": "march-2026-native-daily-cross-check",
            "mismatches": [{"date": r["date"], "localHourlyHigh": r["tempHigh"],
                            "nativeDailyHigh": reference[r["date"]]}
                           for r in output["analysis"]["march2026"]["daily"]
                           if r["tempHigh"] != reference[r["date"]]],
            "note": "Native API daily bins retained for comparison only; exported metrics use IANA local civil days."}
    assert len(dates) == (end - start).days + 1
    assert all(len(array) == len(dates) for array in values.values())
    payload = json.dumps(output, ensure_ascii=True, allow_nan=False, separators=(",", ":"))
    (ROOT / "data").mkdir(exist_ok=True)
    (ROOT / "data/weather.json").write_text(payload + "\n", encoding="utf-8")
    (ROOT / "data/weather.js").write_text("window.SF_WEATHER=" + payload + ";\n", encoding="utf-8")
    print(json.dumps({"days": len(dates), "start": output["start"], "end": output["end"],
                      "march2026": {k: v for k, v in output["analysis"]["march2026"].items() if k not in ("daily", "otherMarches")},
                      "dayLengthCounts": output["metadata"]["dayLengthCounts"]}, indent=2))


class Tests(unittest.TestCase):
    def test_fixed_source_selection(self):
        land = {0: (None, None, None, None, 100, None, None),
                3600: (65, None, None, None, 100, None, None)}
        coastal = {0: (80, 3, 0, 0, 20, 100, 3)}
        selected = select_inputs(land, coastal)
        self.assertIsNone(selected[0][0])
        self.assertEqual(selected[0][1], 3)
        self.assertFalse(fog(*selected[0][4:]))
        self.assertEqual(selected[3600][0], 65)
        self.assertTrue(all(v is None for v in selected[3600][1:]))

    def test_independent_availability(self):
        older = dict.fromkeys(KEYS, 1)
        newer = dict.fromkeys(KEYS, None)
        newer["tempHigh"] = 60
        latest = latest_by_metric([("2026-09-20", older), ("2026-09-21", newer)])
        self.assertEqual(latest["tempHigh"], "2026-09-21")
        self.assertEqual(latest["solar"], "2026-09-20")
        self.assertEqual(max(latest.values()), "2026-09-21")

    def test_dst_and_energy(self):
        for iso, hours in (("2026-03-08", 23), ("2025-11-02", 25), ("2026-03-09", 24)):
            day = date.fromisoformat(iso)
            start, end = bounds(day)
            rows = {t: (60, 10, 25.4, 100, 95, 90, 3) for t in range(start, end + 1, 3600)}
            vals, cov = aggregate(rows, day)
            self.assertEqual(cov["expectedHours"], hours)
            self.assertEqual(vals["windEnergy"], 612.5 * hours)
            self.assertEqual(vals["fogProxy"], hours)
            self.assertEqual(vals["precipitation"], hours)
            self.assertAlmostEqual(vals["solar"], hours * 0.36)

    def test_missing_and_interval_endpoints(self):
        day = date(2026, 3, 9)
        start, end = bounds(day)
        rows = {t: (60, 0, 0, 0, 0, 0, 0) for t in range(start, end + 1, 3600)}
        rows[start] = (60, None, None, None, None, None, None)
        vals, cov = aggregate(rows, day)
        self.assertIsNone(vals["windEnergy"])
        self.assertIsNone(vals["fogProxy"])
        self.assertEqual(vals["precipitation"], 0)
        self.assertEqual(cov["validHours"]["windEnergy"], 23)
        del rows[end]
        vals, _ = aggregate(rows, day)
        self.assertIsNone(vals["solar"])
        self.assertEqual(vals["tempHigh"], 60)

    def test_fog_missing(self):
        self.assertIsNone(fog(None, None, None))
        self.assertIsNone(fog(None, 100, 3))
        self.assertIsNone(fog(20, 0, None))
        self.assertTrue(fog(None, None, 45))
        self.assertTrue(fog(90, 80, None))
        self.assertFalse(fog(None, 20, 3))

    def test_empty_stats(self):
        self.assertEqual(stats([None, None]), {"mean": None, "count": 0, "missingCount": 2})
        self.assertEqual(stats([0, None])["mean"], 0)


if __name__ == "__main__":
    main()
