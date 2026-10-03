#!/usr/bin/env python3
"""Fetch completed San Francisco home games using only Python's standard library."""

import argparse
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
import hashlib
import json
from pathlib import Path
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import urlopen
from zoneinfo import ZoneInfo


ROOT = Path(__file__).resolve().parents[1]
SF = ZoneInfo("America/Los_Angeles")
TEAMS = {
    "giants": {"name": "San Francisco Giants", "color": "#FD5A1E", "league": "MLB",
               "venue": "Oracle Park", "mlbId": 137, "espnId": "26", "sfSince": "2000-04-11"},
    "warriors": {"name": "Golden State Warriors", "color": "#1D428A", "league": "NBA",
                 "venue": "Chase Center", "espnId": "9", "sfSince": "2019-10-24"},
    "valkyries": {"name": "Golden State Valkyries", "color": "#AD96DC", "league": "WNBA",
                  "venue": "Chase Center", "espnId": "129689", "sfSince": "2025-05-16"},
}
PHASES = {2: "regular", 3: "postseason", 5: "play-in"}
MLB_TYPES = {"R": "regular", **dict.fromkeys("FDLWCP", "postseason")}
VENUE_CORRECTION_URL = "https://www.nba.com/game/sac-vs-gsw-0021900863/box-score"
# Manually verified historical facts, not assumptions inferred from an empty API.
# Keys are NBA ending years and individual phases; never apply to regular games.
VERIFIED_ABSENCES = {
    (2020, "postseason"): ("https://www.nba.com/news/history-season-review-2019-20", "Warriors absent from the complete playoff bracket."),
    (2020, "play-in"): ("https://www.nba.com/news/history-season-review-2019-20", "Only Portland and Memphis participated in the play-in."),
    (2021, "postseason"): ("https://www.nba.com/game/0052000211", "Memphis eliminated Golden State in the play-in."),
    (2022, "play-in"): ("https://www.nba.com/playoffs/2022/west-first-round-3", "Third-seeded Warriors qualified directly for the playoffs."),
    (2023, "play-in"): ("https://www.nba.com/playoffs/2023/series", "Sixth-seeded Warriors qualified directly for the playoffs."),
    (2024, "postseason"): ("https://www.nba.com/game/gsw-vs-sac-0052300131", "Sacramento eliminated Golden State in the play-in."),
    (2026, "postseason"): ("https://www.nba.com/news/2026-nba-playoffs-schedule", "Phoenix eliminated Golden State in the play-in."),
}
REFERENCES = [
    {"name": "MLB game-type definitions", "url": "https://statsapi.mlb.com/api/v1/gameTypes"},
    {"name": "Warriors first regular-season Chase Center game",
     "url": "https://www.nba.com/game/lac-vs-gsw-0021900016"},
    {"name": "Valkyries 2025 playoff home game relocated to San Jose",
     "url": "https://valkyries.wnba.com/news/valkyries-clinch-postseason-berth-20250904"},
    {"name": "Official correction to ESPN's 2020-02-25 Kings at Warriors venue",
     "url": VENUE_CORRECTION_URL},
]
REFERENCES.extend({"name": f"Official NBA absence verification: {year} {phase}", "url": url,
                   "verifiedOn": "2026-09-27"}
                  for (year, phase), (url, reason) in VERIFIED_ABSENCES.items())


def local_day(value):
    stamp = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if stamp.tzinfo is None:
        raise ValueError("API timestamp lacks timezone")
    return stamp.astimezone(SF).date().isoformat()


def year_ago(value, years):
    try:
        return value.replace(year=value.year - years)
    except ValueError:
        return value.replace(year=value.year - years, day=28)


class Fetcher:
    def __init__(self, timeout=20):
        self.timeout = timeout
        self.sources = []

    def get(self, name, url, role="data", attempts=3):
        record = {"id": hashlib.sha256(url.encode()).hexdigest()[:16],
                  "name": name, "url": url, "role": role}
        self.sources.append(record)
        for attempt in range(attempts):
            try:
                with urlopen(url, timeout=self.timeout) as response:
                    raw = response.read()
                    record.update(httpStatus=response.status, httpDate=response.headers.get("Date"),
                                  lastModified=response.headers.get("Last-Modified"),
                                  sha256=hashlib.sha256(raw).hexdigest())
                payload = json.loads(raw)
                record.update(status="available", retrievedAt=datetime.now(timezone.utc).isoformat(),
                              attempts=attempt + 1,
                              responseTimestamp=payload.get("timestamp") if isinstance(payload, dict) else None)
                record.pop("error", None)
                return payload, record
            except (HTTPError, URLError, TimeoutError, OSError, ValueError) as exc:
                record.update(status="unavailable", error=str(exc), attempts=attempt + 1)
                if isinstance(exc, HTTPError):
                    record["httpStatus"] = exc.code
                    if exc.code in (400, 401, 403, 404):
                        break
                if attempt + 1 < attempts:
                    time.sleep(2 ** attempt)
        print(f"Unavailable: {url}: {record['error']}", file=sys.stderr, flush=True)
        return None, record


def mlb_rows(payload, year):
    if not isinstance(payload.get("dates"), list) or "totalGames" not in payload:
        raise ValueError("Missing MLB schedule schema")
    raw = [g for day in payload["dates"] for g in day["games"]]
    if len(raw) != payload["totalGames"]:
        raise ValueError("MLB schedule count mismatch")
    rows = []
    for g in raw:
        if int(g["season"]) != year:
            raise ValueError("MLB returned a different season")
        if g["gameType"] not in MLB_TYPES:
            continue
        home, away = g["teams"]["home"], g["teams"]["away"]
        if 137 not in (home["team"]["id"], away["team"]["id"]):
            raise ValueError("MLB returned another team's game")
        venue = g.get("venue", {})
        status = g["status"]
        completed = status["abstractGameState"] == "Final" and status["detailedState"] in (
            "Final", "Game Over", "Completed Early")
        # Oracle Park was named AT&T Park through 2018. The stable venue ID is 2395.
        valid_venue = venue.get("id") == 2395 and venue.get("name") in ("Oracle Park", "AT&T Park")
        row = {"id": f"mlb:{g['gamePk']}", "date": local_day(g["gameDate"]),
               "startTime": g["gameDate"], "team": "giants", "season": year,
               "phase": MLB_TYPES[g["gameType"]], "phaseDetail": g.get("seriesDescription"),
               "opponent": away["team"]["name"] if home["team"]["id"] == 137 else home["team"]["name"],
               "venue": venue.get("name"), "venueId": venue.get("id"),
               "home": home["team"]["id"] == 137, "sfVenue": valid_venue,
               "venueKnown": bool(venue.get("id")), "neutral": False,
               "completed": completed, "status": status["detailedState"],
               "homeScore": home.get("score"), "awayScore": away.get("score"),
               "doubleheader": g.get("doubleHeader", "N"), "gameNumber": g.get("gameNumber", 1),
               "officialDate": g.get("officialDate"),
               "unresolved": not completed and status["detailedState"] not in ("Postponed", "Cancelled"),
               "url": f"https://www.mlb.com/gameday/{g['gamePk']}"}
        for key in ("rescheduledFromDate", "rescheduledGameDate", "resumeDate", "resumedFromDate"):
            if g.get(key):
                row[key] = g[key]
        rows.append(row)
    return rows


def espn_rows(payload, team, year, season_type):
    if payload.get("status") != "success" or not isinstance(payload.get("events"), list):
        raise ValueError("Missing ESPN schedule schema or unsuccessful response")
    if payload.get("team", {}).get("id") != TEAMS[team]["espnId"]:
        raise ValueError("ESPN returned a different team")
    requested = payload.get("requestedSeason")
    if requested and (requested["year"] != year or requested["type"] != season_type):
        raise ValueError("ESPN returned a different requested season")
    rows = []
    for event in payload["events"]:
        if event["season"]["year"] != year or event["seasonType"]["type"] != season_type:
            raise ValueError("ESPN event season or phase mismatch")
        if len(event["competitions"]) != 1:
            raise ValueError("Unexpected ESPN competition count")
        c = event["competitions"][0]
        competitors = {x["homeAway"]: x for x in c["competitors"]}
        home, away = competitors["home"], competitors["away"]
        if TEAMS[team]["espnId"] not in (home["id"], away["id"]):
            raise ValueError("ESPN event does not contain requested team")
        venue = c.get("venue", {})
        city = venue.get("address", {}).get("city")
        venue_name = venue.get("fullName")
        correction = None
        # ESPN incorrectly attaches a New Orleans venue to this specific game.
        # NBA's official box score establishes Chase Center; never infer a venue
        # merely from a home designation.
        if team == "warriors" and event["id"] == "401161505":
            if local_day(c["date"]) != "2020-02-25" or away["id"] != "23" or home["id"] != "9":
                raise ValueError("Venue correction identity guard failed")
            if venue_name != "Chase Center" or city != "San Francisco":
                correction = {"originalVenue": venue_name, "originalCity": city,
                              "sourceUrl": VENUE_CORRECTION_URL,
                              "reason": "Official NBA box score contradicts ESPN venue"}
                venue_name, city = "Chase Center", "San Francisco"
        status = c["status"]["type"]
        completed = status.get("completed") is True and status.get("name") in (
            "STATUS_FINAL", "STATUS_FINAL_OVERTIME")
        is_home = home["id"] == TEAMS[team]["espnId"]
        valid_venue = venue_name == "Chase Center" and city == "San Francisco"
        if team == "giants":
            valid_venue = venue.get("fullName") in ("Oracle Park", "AT&T Park") and city == "San Francisco"
        notes = "; ".join(n.get("headline", "") for n in c.get("notes", []))
        rows.append({"id": f"espn:{TEAMS[team]['league'].lower()}:{event['id']}",
                     "date": local_day(c["date"]), "startTime": c["date"], "team": team,
                     "season": year, "phase": PHASES[season_type], "phaseDetail": notes or None,
                     "opponent": (away if is_home else home)["team"]["displayName"],
                     "venue": venue_name, "city": city,
                     "home": is_home, "sfVenue": valid_venue,
                     "venueKnown": bool(venue.get("fullName") and city),
                     "neutral": c.get("neutralSite", False), "completed": completed,
                     "status": status.get("description"),
                     "homeScore": home.get("score", {}).get("value"),
                     "awayScore": away.get("score", {}).get("value"),
                     "unresolved": not completed and status.get("name") not in (
                         "STATUS_POSTPONED", "STATUS_CANCELED", "STATUS_CANCELLED"),
                     "url": f"https://www.espn.com/{TEAMS[team]['league'].lower()}/game/_/gameId/{event['id']}"})
        if correction:
            rows[-1]["venueCorrection"] = correction
    return rows


def assess(rows, team, phase, year, start, end, source, empty_unverified=False):
    selected, excluded, warnings, excluded_games = [], Counter(), [], []
    scoped = [r for r in rows if r["phase"] == phase and start <= r["date"] <= end]
    record = {"team": team, "season": year, "phase": phase, "start": start, "end": end,
              "source": source["id"], "status": "complete", "games": 0,
              "sourceEvents": sum(r["phase"] == phase for r in rows), "eventsInWindow": len(scoped)}
    http_day = None
    try:
        http_day = parsedate_to_datetime(source["httpDate"]).astimezone(SF).date().isoformat()
    except (KeyError, TypeError, ValueError):
        pass
    record["sourceHttpDate"] = source.get("httpDate")
    if http_day and http_day < end:
        warnings.append(f"HTTP response date {http_day} precedes requested end")
    for row in scoped:
        if not row["home"]:
            excluded["away"] += 1
            continue
        if row["neutral"] or not row["sfVenue"]:
            excluded["neutral_or_outside_sf"] += 1
            excluded_games.append({"id": row["id"], "date": row["date"], "venue": row["venue"],
                                   "reason": "neutral_or_outside_sf"})
            if not row["venueKnown"]:
                warnings.append(f"Unknown home venue: {row['id']}")
            continue
        if not row["completed"]:
            excluded["not_completed"] += 1
            if row["unresolved"]:
                warnings.append(f"Past home game not final: {row['id']} ({row['status']})")
            continue
        if row.get("resumeDate") and local_day(row["resumeDate"]) > end:
            excluded["completed_after_cutoff"] += 1
            continue
        selected.append({k: v for k, v in row.items() if k not in (
            "sfVenue", "venueKnown", "neutral", "unresolved")})
        selected[-1]["source"] = source["id"]
    record["games"] = len(selected)
    record["excluded"] = dict(sorted(excluded.items()))
    if excluded_games:
        record["excludedHomeGames"] = excluded_games
    finals = [r["date"] for r in scoped if r["completed"]]
    record["lastCompletedTeamGame"] = max(finals, default=None)
    record["lastCompletedSFHomeGame"] = max((r["date"] for r in selected), default=None)
    phase_dates = [r["date"] for r in rows if r["phase"] == phase]
    record["firstScheduledTeamGame"] = min(phase_dates, default=None)
    if warnings:
        record.update(status="partial", warnings=warnings, verifiedThrough=None)
    elif empty_unverified:
        record.update(status="no_games_reported", verifiedThrough=None,
                      note="Successful empty schedule response without a verified season context; not independent proof of absence.")
    else:
        record.update(status="complete" if selected else "no_sf_games", verifiedThrough=end)
    return selected, record


def espn_fetch(fetcher, team, year, season_type):
    league, slug, sport = {"giants": ("mlb", "sf", "baseball"),
                           "warriors": ("nba", "gs", "basketball"),
                           "valkyries": ("wnba", "gsv", "basketball")}[team]
    url = f"https://site.api.espn.com/apis/site/v2/sports/{sport}/{league}/teams/{slug}/schedule?"
    return fetcher.get(f"ESPN {league.upper()} {year} {PHASES[season_type]}",
                       url + urlencode({"season": year, "seasontype": season_type}))


def add_partition(games, coverage, payload, source, normalizer, team, year, phase, start, end):
    if payload is None:
        coverage.append({"team": team, "season": year, "phase": phase, "start": start,
                         "end": end, "status": "unavailable", "games": 0,
                         "source": source["id"], "verifiedThrough": None, "reason": source.get("error")})
        return
    try:
        rows = normalizer(payload)
        selected, record = assess(rows, team, phase, year, start, end, source,
                                  ("events" in payload and not payload["events"] and not payload.get("requestedSeason"))
                                  or ("totalGames" in payload and payload["totalGames"] == 0))
        games.extend(selected)
        coverage.append(record)
    except (KeyError, TypeError, ValueError) as exc:
        coverage.append({"team": team, "season": year, "phase": phase, "start": start,
                         "end": end, "status": "unavailable", "games": 0,
                         "source": source["id"], "verifiedThrough": None, "reason": f"Schema validation: {exc}"})


def resolve_absences(coverage):
    for c in coverage:
        if c["status"] != "no_games_reported" or c["team"] != "warriors":
            continue
        fact = VERIFIED_ABSENCES.get((c["season"], c["phase"]))
        if fact:
            url, reason = fact
            c.update(status="no_sf_games", verifiedThrough=c["end"],
                     originalStatus="no_games_reported", reason="verified_team_nonparticipation",
                     verification={"method": "curated_official_record", "url": url,
                                   "verifiedOn": "2026-09-27", "finding": reason})
            c.pop("note", None)
            continue
        regular = next((r for r in coverage if r["team"] == c["team"] and r.get("season") == c["season"]
                        and r["phase"] == "regular" and r["status"] in ("complete", "no_sf_games")
                        and r.get("verifiedThrough", "") >= c["end"]), None)
        first_game = regular.get("firstScheduledTeamGame") if regular else None
        if c["phase"] in ("postseason", "play-in") and first_game and c["end"] < first_game:
            c.update(status="no_sf_games", verifiedThrough=c["end"],
                     originalStatus="no_games_reported", reason="season_not_yet_started",
                     phaseStatus="not_yet_started",
                     verification={"method": "validated_regular_season_schedule",
                                   "source": regular["source"], "seasonFirstGame": first_game})
            c.pop("note", None)


def sports_covered(result, day, team):
    """Coverage labels completeness only; it must never filter known game rows."""
    if not result["start"] <= day <= result["end"]:
        return False
    records = [c for c in result["coverage"] if c["team"] == team and c["start"] <= day <= c["end"]]
    if any(c["phase"] == "all" and c["status"] == "not_applicable" for c in records):
        return True
    phases = ("regular", "postseason", "play-in") if team == "warriors" else ("regular", "postseason")
    for phase in phases:
        matches = [c for c in records if c["phase"] == phase]
        if not matches or any(c["status"] not in ("complete", "no_sf_games")
                              or (c.get("verifiedThrough") or "") < day for c in matches):
            return False
    return True


def validate(result):
    ids = set()
    for g in result["games"]:
        if g["id"] in ids:
            raise ValueError(f"Duplicate game ID {g['id']}")
        ids.add(g["id"])
        assert result["start"] <= g["date"] <= result["end"]
        assert g["date"] == local_day(g["startTime"])
        assert g["home"] and g["completed"]
        assert g["phase"] in PHASES.values()
        assert g["date"] >= TEAMS[g["team"]]["sfSince"]
        assert g["venue"] in (("Oracle Park", "AT&T Park") if g["team"] == "giants" else ("Chase Center",))
        assert g["homeScore"] is not None and g["awayScore"] is not None
    assert sum(c["games"] for c in result["coverage"]) == len(result["games"])
    # Historical sentinels protect timezone/phase/venue rules against regression.
    sentinels = [
        ("warriors", "2019-10-24", "regular", "espn:nba:401160658"),
        ("warriors", "2020-02-25", "regular", "espn:nba:401161505"),
        ("warriors", "2021-05-21", "play-in", "espn:nba:401326994"),
        ("warriors", "2025-04-15", "play-in", "espn:nba:401766459"),
        ("valkyries", "2025-05-16", "regular", "espn:wnba:401736114"),
    ]
    for team, day, phase, game_id in sentinels:
        if any(c["team"] == team and c["phase"] == phase and c["start"] <= day <= c["end"]
               and c["status"] == "complete" for c in result["coverage"]):
            assert game_id in ids, f"Known historical game missing: {game_id}"
    assert not any(g["team"] == "valkyries" and g["date"] == "2025-09-17" for g in result["games"])
    by_date = defaultdict(list)
    for g in result["games"]:
        by_date[g["date"]].append(g)
    for same_day in by_date.values():
        for g in same_day:
            assert set(g["sameDayGameIds"]) == {x["id"] for x in same_day if x["id"] != g["id"]}


def self_test():
    assert local_day("2019-10-25T02:30Z") == "2019-10-24"
    assert local_day("2025-01-01T07:30:00Z") == "2024-12-31"
    assert year_ago(date(2024, 2, 29), 10) == date(2014, 2, 28)
    base = {"id": "test:1", "date": "2025-05-01", "phase": "regular", "home": True, "venue": "Oracle Park",
            "sfVenue": True, "venueKnown": True, "neutral": False, "completed": True,
            "unresolved": False, "status": "Final"}
    rows = [base, dict(base, id="test:2"), dict(base, id="test:3", home=False),
            dict(base, id="test:4", neutral=True), dict(base, id="test:5", sfVenue=False),
            dict(base, id="test:6", completed=False, status="Postponed"),
            dict(base, id="test:7", date="2025-05-02")]
    kept, c = assess(rows, "giants", "regular", 2025, "2025-05-01", "2025-05-01", {"id": "test"})
    assert [r["id"] for r in kept] == ["test:1", "test:2"]
    assert c["status"] == "complete" and c["games"] == 2
    _, c = assess([dict(base, completed=False, unresolved=True)], "giants", "regular", 2025,
                  "2025-05-01", "2025-05-01", {"id": "test"})
    assert c["status"] == "partial"
    _, c = assess([], "warriors", "postseason", 2021, "2021-01-01", "2021-06-30",
                  {"id": "test"}, empty_unverified=True)
    assert c["status"] == "no_games_reported" and c["verifiedThrough"] is None
    event = {"id": "401161505", "season": {"year": 2020}, "seasonType": {"type": 2},
             "competitions": [{"date": "2020-02-26T03:00Z", "venue": {"fullName": "Smoothie King Center",
                               "address": {"city": "New Orleans"}}, "competitors": [
                 {"id": "9", "homeAway": "home", "team": {"displayName": "Golden State Warriors"}, "score": {"value": 94}},
                 {"id": "23", "homeAway": "away", "team": {"displayName": "Sacramento Kings"}, "score": {"value": 112}}],
                 "status": {"type": {"name": "STATUS_FINAL", "completed": True, "description": "Final"}}}]}
    payload = {"status": "success", "team": {"id": "9"}, "events": [event]}
    normalized = espn_rows(payload, "warriors", 2020, 2)
    assert normalized[0]["sfVenue"] and normalized[0]["date"] == "2020-02-25"
    assert normalized[0]["venueCorrection"]["originalCity"] == "New Orleans"
    event["seasonType"]["type"] = 3
    try:
        espn_rows(payload, "warriors", 2020, 2)
    except ValueError:
        pass
    else:
        raise AssertionError("Wrong event phase was accepted")
    mlb_game = {"gamePk": 1, "gameDate": "2020-08-27T23:00:00Z", "season": "2020", "gameType": "R",
                "teams": {"home": {"team": {"id": 137, "name": "San Francisco Giants"}, "score": 0},
                          "away": {"team": {"id": 119, "name": "Los Angeles Dodgers"}, "score": 2}},
                "venue": {"id": 2395, "name": "Oracle Park"},
                "status": {"abstractGameState": "Final", "detailedState": "Completed Early"}}
    payload = {"dates": [{"games": [mlb_game]}], "totalGames": 1}
    assert mlb_rows(payload, 2020)[0]["completed"]
    mlb_game["status"]["detailedState"] = "Cancelled"
    assert not mlb_rows(payload, 2020)[0]["completed"]
    mlb_game["gameType"] = "S"
    assert mlb_rows(payload, 2020) == []
    fixture = {"start": "2020-01-01", "end": "2020-06-30", "coverage": [
        {"team": "warriors", "season": 2020, "phase": phase, "start": "2020-01-01", "end": "2020-06-30",
         "status": "complete" if phase == "regular" else "no_games_reported",
         "verifiedThrough": "2020-06-30" if phase == "regular" else None}
        for phase in ("regular", "postseason", "play-in")]}
    assert not sports_covered(fixture, "2020-02-25", "warriors")
    resolve_absences(fixture["coverage"])
    assert sports_covered(fixture, "2020-02-25", "warriors")
    fixture["coverage"][0]["status"] = "partial"
    assert not sports_covered(fixture, "2020-02-25", "warriors")
    assert not sports_covered(fixture, "2020-07-01", "warriors")
    print("Self-tests passed (dates, filters, doubleheaders, coverage, phase schema, venue correction, MLB final states).")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--as-of", type=date.fromisoformat, help="Local SF date; default today")
    parser.add_argument("--start", type=date.fromisoformat)
    parser.add_argument("--end", type=date.fromisoformat)
    parser.add_argument("--timeout", type=float, default=20)
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--validate", action="store_true", help="Validate existing JSON/JS without network")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return 0
    if args.validate:
        result = json.loads((ROOT / "data/sports.json").read_text())
        validate(result)
        js = (ROOT / "data/sports.js").read_text()
        assert json.loads(js.removeprefix("window.SF_SPORTS = ").rstrip(";\n")) == result
        print(f"Validated {len(result['games'])} games and matching JSON/JS.")
        return 0
    now = datetime.now(timezone.utc)
    today = now.astimezone(SF).date()
    as_of = args.as_of or today
    start = args.start or year_ago(as_of, 10)
    end = args.end or as_of - timedelta(days=1)
    if not start <= end < min(today, as_of):
        parser.error("Require start <= end < both actual SF today and --as-of")
    fetcher = Fetcher(args.timeout)
    games, coverage = [], []
    # These official basketball endpoints are probed explicitly. ESPN's historical
    # team schedules remain the fallback; current-season CDN files are not archives.
    for league in ("nba", "wnba"):
        fetcher.get(f"Official {league.upper()} schedule availability probe",
                    f"https://cdn.{league}.com/static/json/staticData/scheduleLeagueV2_1.json",
                    role="availability_probe", attempts=1)
    for year in range(start.year, end.year + 1):
        lo, hi = max(start, date(year, 1, 1)).isoformat(), min(end, date(year, 12, 31)).isoformat()
        url = "https://statsapi.mlb.com/api/v1/schedule?" + urlencode(
            {"sportId": 1, "teamId": 137, "season": year, "hydrate": "venue"})
        payload, source = fetcher.get(f"Official MLB Giants {year} schedule", url)
        for phase in ("regular", "postseason"):
            if payload is not None:
                add_partition(games, coverage, payload, source, lambda p: mlb_rows(p, year),
                              "giants", year, phase, lo, hi)
            else:
                season_type = 2 if phase == "regular" else 3
                fallback, fs = espn_fetch(fetcher, "giants", year, season_type)
                add_partition(games, coverage, fallback, fs,
                              lambda p: espn_rows(p, "giants", year, season_type),
                              "giants", year, phase, lo, hi)
        print(f"Giants {year}: {sum(g['team'] == 'giants' and g['season'] == year for g in games)} SF games", flush=True)
    for team in ("warriors", "valkyries"):
        begins = date.fromisoformat(TEAMS[team]["sfSince"])
        if start < begins:
            coverage.append({"team": team, "phase": "all", "start": start.isoformat(),
                             "end": min(end, begins - timedelta(days=1)).isoformat(),
                             "status": "not_applicable", "games": 0,
                             "reason": "Before first eligible SF regular-season home game"})
        if end < begins:
            continue
        first_year = max(start.year, 2020 if team == "warriors" else 2025)
        last_year = end.year + (1 if team == "warriors" and end.month >= 7 else 0)
        for year in range(first_year, last_year + 1):
            season_start = date(year - 1, 7, 1) if team == "warriors" else date(year, 1, 1)
            season_end = date(year, 6, 30) if team == "warriors" else date(year, 12, 31)
            lo, hi = max(start, begins, season_start), min(end, season_end)
            if lo > hi:
                continue
            for season_type in ((2, 3, 5) if team == "warriors" else (2, 3)):
                payload, source = espn_fetch(fetcher, team, year, season_type)
                add_partition(games, coverage, payload, source,
                              lambda p: espn_rows(p, team, year, season_type),
                              team, year, PHASES[season_type], lo.isoformat(), hi.isoformat())
            print(f"{TEAMS[team]['name']} {year}: {sum(g['team'] == team and g['season'] == year for g in games)} SF games", flush=True)
    resolve_absences(coverage)
    games.sort(key=lambda g: (g["date"], g["startTime"], g["team"], g["id"]))
    by_date = defaultdict(list)
    for game in games:
        by_date[game["date"]].append(game)
    for same_day in by_date.values():
        for game in same_day:
            game["sameDayGameIds"] = [g["id"] for g in same_day if g["id"] != game["id"]]
    coverage.sort(key=lambda c: (c["team"], c["start"], c["phase"]))
    result = {"fetchedAt": datetime.now(timezone.utc).isoformat(), "fetchStartedAt": now.isoformat(),
              "start": start.isoformat(), "end": end.isoformat(),
              "asOf": as_of.isoformat(), "timezone": "America/Los_Angeles", "schemaVersion": 1,
              "teams": TEAMS, "games": games, "coverage": coverage,
              "sources": fetcher.sources + [dict(r, role="reference") for r in REFERENCES]}
    result["summary"] = {team: {"games": sum(g["team"] == team for g in games),
                                 "lastGame": max((g["date"] for g in games if g["team"] == team), default=None),
                                 "phases": dict(Counter(g["phase"] for g in games if g["team"] == team))}
                         for team in TEAMS}
    validate(result)
    (ROOT / "data").mkdir(exist_ok=True)
    serialized = json.dumps(result, ensure_ascii=True, indent=2) + "\n"
    (ROOT / "data/sports.json").write_text(serialized)
    (ROOT / "data/sports.js").write_text("window.SF_SPORTS = " + serialized.rstrip() + ";\n")
    print(json.dumps(result["summary"], indent=2))
    print("Coverage:", dict(Counter(c["status"] for c in coverage)))
    return 1 if any(c["status"] in ("unavailable", "partial") for c in coverage) else 0


if __name__ == "__main__":
    sys.exit(main())
