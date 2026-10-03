# Annual Events: Scope and Sources

This is a curated calendar of eleven recurring events that help define San
Francisco's social year, not an exhaustive inventory or an attendance dataset.
Historical dates are reviewed edition by edition. No dates are generated from
rules such as "the last Sunday in June."

## What a Colored Day Means

- SF Marathon and Bay to Breakers: race day, not the expo or registration period.
- Pride and Chinese New Year: the parade day, not their longer celebration season.
- Bring Your Own Big Wheel: the street race, not a conventional cycling event.
- Carnaval, Outside Lands, and Hardly Strictly Bluegrass: the festival span.
- Folsom Street Fair: the fair day, not the associated parties.
- Fleet Week: the published festival span. An air-show cancellation does not
  necessarily cancel the other activities. Edition notes retain this distinction.
- Burning Man: the official Nevada event span. The local connection is the
  departure of SF participants, not an event within city limits. Neither the
  number of departures nor individual travel dates is measured here.

Dates use each event's local civil calendar and both ends of a span are included.
Only `held` records color the chart. Canceled and virtual editions remain available
in date inspection, with their status stated explicitly. These are distinct from
in-person gatherings. Unofficial alternatives are not silently substituted for
a canceled named event.

The chart's existing weather/sports endpoint still defines its ten-year window.
An archived event outside that window is not shown, even when its date is known.

## Sources and Gaps

Every record has a source URL. Select a date to see the edition's notes and links.
The research files describe provenance and gaps:

- [Races and Pride](events-races-notes.md)
- [Chinese New Year, Fleet Week, Burning Man, Folsom](events-civic-notes.md)
- [Music festivals and Carnaval](events-festivals-notes.md)

Blank dates mean **no listed in-person event**, not a verified absence of activity.
The archive is not a complete daily observation system, so it does not borrow
the weather layer's missing-data hatching. Coverage limitations are disclosed in
the legend and here instead of visually equating unknown dates with cancellations.

## Display and Maintenance

Each event has a named color and emoji mnemonic. Emoji vary by platform; the
Big Wheel bicycle symbol is a mnemonic, not a drawing of the race's toy tricycles.
Overlapping daily cells use stripes. Optional symbols are centered within the
visible portion of an edition; a symbol is omitted when it would collide with
another symbol. The exact colored dates remain in place.

The toggle list is also the categorical legend. Selecting one event updates the
center title and hides every other event. Numeric smoothing and seasonal summaries
are disabled for this categorical layer.

Edit `data/events-catalog.json` for labels/colors and the three research JSON files
for editions. Then run `python3 scripts/build-events.py`. It validates IDs, ISO
dates, status, duration, source URLs, and duplicates before creating both JSON and
classic JavaScript snapshots. Viewing the app does not require network access.
