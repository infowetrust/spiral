# Race and Parade Date Research

Researched 2026-10-02 for the inclusive interval 2016-09-27 through 2026-09-26. The companion data file has 38 annual records: marathon 10, Bay to Breakers 10, Big Wheel 9, Pride parade 9. Every record has source URLs in its `source` string; multiple URLs are separated by ` ; `.

## Conventions

- IDs identify the recurring event, not a unique annual edition. Use `(id, start)` as the record key.
- Dates are inclusive local calendar dates. Single-day races/parades have identical `start` and `end`.
- Marathon records describe the full-marathon race day, excluding expos, Saturday races, and other race-weekend activities. Pride records describe the official street parade, not the two-day Civic Center celebration, Trans March, Dyke March, or independent People's March.
- `held` means the in-person edition; `virtual` identifies the replacement remote race window; `cancelled` preserves a sourced scheduled date that did not occur. An announcement's publication date or street-closure setup period is not an event date.
- Prefer organizer archives, race results, public-agency records, and contemporary local reporting. No dates were generated from recurrence rules. Some older editions rely on dated organizer announcements or agency notices rather than a surviving post-event report.

## Gaps and Exclusions

- **Big Wheel 2021: omitted.** The [organizer's cancellation announcement](https://bringyourownbigwheel.com/hang-on-tight-fans-we-are-postponed-again-until-2022/) establishes that the event did not happen and was deferred to 2022. It does not state an exact planned 2021 race date. Do not insert an Easter-derived date or label it held.
- **Pride parade 2021: omitted.** The [Civic Center event archive](https://sfciviccenter.org/event/san-francisco-pride-2021/) and [contemporary Chronicle coverage](https://www.sfchronicle.com/entertainment/article/san-francisco-pride-2021-parade-is-canceled-but-21183996.php) establish that there was no traditional parade. An exact originally scheduled parade date was not verified. Movie nights and the independent People's March are not substitutes for this record.
- **2016: outside the requested interval.** The four annual editions preceded September 27: [marathon July 31](https://www.sfchronicle.com/news/article/27-000-rise-to-the-challenge-of-the-hilly-S-F-8897103.php), [Bay to Breakers May 15](https://arrs.run/HP_BtB12.htm), Big Wheel in March, and [Pride parade June 26](https://www.sfchronicle.com/culture/article/50-years-of-San-Francisco-s-Pride-Parade-15364760.php). No in-window 2016 edition was found. The March Big Wheel calendar listing is [here](https://www.ronniesawesomelist.com/march-2016); its stale location text was not used as event-location evidence.
- **Marathon 2020 virtual option:** not separately recorded because a precise virtual participation window was not verified. The record preserves the [explicitly cancelled November 15 in-person date](https://www.goldengate.org/events/cancelled-san-francisco-marathon---nov-2020/). It does not assert that no virtual option existed. The earlier July date is not duplicated as another annual edition.
- **Bay to Breakers 2020-2021:** represented by the replacement virtual editions rather than duplicate cancelled in-person records. The [2020 organizer race guide](https://capstoneraces.com/wp-content/uploads/2020/09/B2B-Virtual-Race-Guide.pdf) specifies September 20 through October 2 for results; [2021 reporting](https://sf.funcheap.com/city-guide/bay-breakers-live-event-canceled-2021/) gives May 16 through June 2. Neither is a held San Francisco street race.
- **Pride 2020:** the street parade is cancelled in the data; the [June 27-28 online celebration](https://cdn.sfpride.org/press/SFPride50-Lineup-Announcement-Part-II.pdf) is intentionally not added as a second parade record.

## Source Caveats

- Big Wheel's archive shows later page-update timestamps on older posts. The dates in the event text, not those update timestamps, determine the records. The 2024 direct article intermittently timed out; the organizer's news archive explicitly preserves March 31, 2024.
- The Golden Gate agency page for the 2024 marathon has a stale search-result title mentioning 2023. Its URL, visible heading, and event date all specify July 28, 2024. This is also corroborated by the [Presidio's 2024 schedule](https://wp.presidio.gov/wp-content/uploads/2024/04/2024-Presidio-Special-Events-Schedule-Accessible.pdf).
- Recurring organizer and results landing pages may roll forward. Where available, annual article URLs or dated PDFs are retained alongside them.
