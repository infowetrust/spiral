#!/usr/bin/env python3
"""Validate curated event editions and bundle an offline snapshot. No inferred dates."""
import datetime as dt
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
categories = json.loads((DATA / "events-catalog.json").read_text())
ids = {category["id"] for category in categories}
records = []
seen = set()
for name in ("races", "civic", "festivals"):
    for record in json.loads((DATA / f"events-{name}.json").read_text()):
        assert record["id"] in ids, record
        start = dt.date.fromisoformat(record["start"])
        end = dt.date.fromisoformat(record["end"])
        assert start <= end and (end - start).days < 32, record
        assert record["status"] in ("held", "cancelled", "virtual"), record
        sources = record.get("sources", record["source"].split(" ; "))
        assert sources and all(url.startswith("https://") and " " not in url for url in sources), record
        record["source"] = sources[0]
        record["sources"] = sources
        key = (record["id"], record["start"], record["status"])
        assert key not in seen, record
        seen.add(key)
        records.append(record)
snapshot = {
    "reviewedAt": "2026-10-02",
    "start": "2016-09-27",
    "end": "2026-09-26",
    "categories": categories,
    "records": sorted(records, key=lambda r: (r["start"], r["id"])),
    "coverageNote": "A curated calendar, not a complete inventory of city events. Only sourced in-person editions are colored. Canceled and virtual editions remain in the date inspector. Blank dates mean no listed in-person event, not confirmed absence; archival gaps are documented. Future dates outside the chart are not plotted."
}
(DATA / "events.json").write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n")
(DATA / "events.js").write_text("window.SF_EVENTS = " + json.dumps(snapshot, ensure_ascii=False, separators=(",", ":")) + ";\n")
print(f"Bundled {len(records)} event editions across {len(categories)} categories.")
