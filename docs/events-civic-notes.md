# Civic Event Research Notes

Researched 2026-10-02 for the inclusive window 2016-09-27 through 2026-09-26.
Only `data/events-civic.json` and this note were edited for this research.

## Coverage and Semantics

- 39 annual records: Chinese New Year parade 2017-2026 (10); Fleet Week 2016-2025 (10); official Nevada Burning Man 2017-2026 (10); Folsom Street Fair 2017-2025 (9).
- 34 held, 3 virtual, 2 cancelled. Each record has one source URL. Supplemental evidence is linked below rather than concatenated into the source field.
- Dates are inclusive local calendar dates, not UTC timestamps. Single-day events have identical start and end dates.
- No dates were generated from recurrence rules. Every annual date or span has dated source evidence. There are no omitted in-window annual editions in these four series.
- `held` describes the edition, not every advertised performance. `virtual` describes a replacement broadcast/online edition and does not imply a physical gathering. `cancelled` preserves the documented intended dates of the official Nevada event.
- Chinese New Year covers the parade day only, not the entire lunar festival, street fair, or rebroadcast period. Folsom covers the fair itself, not Leather Week or nighttime parties.
- Burning Man covers the official Black Rock City event in Nevada. It is relevant to SF residents leaving the city, not an SF venue. No speculative SF departure/return buffer, build week, cleanup, or unofficial gathering is included.

## Boundary Exclusions

- Chinese New Year and Burning Man 2016 preceded the opening boundary.
- Folsom 2016 was September 25, before the boundary: [SFMTA approved closure record](https://www.sfmta.com/ar/media/5885/download?inline=).
- Folsom 2026 was September 27, one day after the closing boundary: [SFMTA event notice](https://www.sfmta.com/index.php/reports/folsom-street-fair-9272026).
- Fleet Week 2026 is October 4-12, after the boundary: [organizer calendar](https://fleetweeksf.org/calendar-of-events/).

## Pandemic Editions

- CNY 2020 was held February 8, before the shutdown; independently confirmed by [KALW's same-day photo report](https://www.kalw.org/arts-culture/2020-02-08/san-franciscos-chinese-new-year-parade-in-pictures).
- CNY 2021: the organizer explicitly cancelled the live festivities and substituted a February 20 television special. The JSON uses `virtual` on the broadcast date, not `held`: [organizer announcement](https://chineseparade.com/wp-content/uploads/2020/12/CNYP-2021-Press-Release_Final.pdf).
- Fleet Week 2020: the organizer's IRS-filed 990-EZ reports the program as September 29-October 11, with more than 40 virtual events. That full organizer-reported span is used, not merely the October 9-11 public livestream weekend. [Organizer filing](https://apps.irs.gov/pub/epostcard/cor/272832209_202012_990EZ_2022102420520422.pdf), [public virtual-weekend listing](https://sf.funcheap.com/city-guide/san-francisco-fleet-week-virtual-oct-911/), [organizer airshow cancellation announcement](https://www.prnewswire.com/news-releases/the-2020-san-francisco-fleet-week-air-show-presented-by-united-postpones-to-2021-in-response-to-covid-19-301088074.html). The October 5 ceremonial ship appearance does not make this a normal in-person festival.
- Burning Man 2020: official Nevada event cancelled; virtual Multiverse is mentioned in the note but not counted as a held Nevada event. [Organizer cancellation](https://journal.burningman.org/2020/04/news/official-announcements/brc-2020-update/); intended August 30-September 7 dates corroborated by [contemporaneous cancellation coverage](https://www.grammy.com/news/burning-man-2020-canceled-due-coronavirus-pandemic-announces-virtual-festival/).
- Burning Man 2021: official Nevada event cancelled. The intended August 29-September 6 dates appear in the [organizer's February planning update](https://journal.burningman.org/2021/02/black-rock-city/building-brc/2021-february-update/); cancellation is in its [April announcement](https://journal.burningman.org/2021/04/news/official-announcements/into-the-great-unknown/). The separate [Virtual Burn ran August 22-September 7](https://history.burningman.org/timeline/2021/). Unofficial desert gatherings are not the official event.
- Folsom 2020 was virtual September 27: [organizer page](https://www.folsomstreet.org/folsom-street-fair-2020) and [participating cultural district's retrospective](https://sfleatherdistrict.org/2020/09/?page_number_0=2).
- Folsom 2021 returned in person as MEGAHOOD2021 on September 26: [organizer calendar entry](https://www.folsomstreet.org/fs-events-calendar/folsom-street-presents-megahood2021), corroborated by [post-event reporting](https://sfstandard.com/2021/09/27/scenes-from-folsom-street-fair-megahood-2021/).

## Fleet Week Spans and Airshows

Full published festival/program spans are used rather than the Friday-Sunday airshow alone. Separately extended gallery exhibitions and year-round planning are not festival boundaries.

- 2016: October 3-10 is in an organizer-issued press release and [regional emergency-planning record](https://bayareauasi.com/sites/default/files/resources/081116%20Agenda%20Item%206%20%202016%20Fleet%20Week%20Planning.pdf).
- 2017: October 2-9 is supported by the Port of Oakland and the [contemporaneous full-festival listing](https://sf.funcheap.com/city-guide/fleet-week-2017/).
- 2018: October 1-8 follows the Port of San Francisco's September 25 meeting record. A shorter October 1-7 entertainment listing omits the final day; [post-event reporting also gives October 1-8](https://hoodline.com/2018/10/scenes-from-san-francisco-fleet-week-2018/).
- 2019: October 6-14 includes Sunday ship arrivals and emergency-response activities in the organizer's media program. Some civic reports use October 7, the kickoff press-conference date. The [Navy's account](https://www.navy.mil/Press-Office/Press-Releases/display-pressreleases/Article/2237339/san-francisco-fleet-week-kicks-off-with-ship-arrivals-remarks/) explicitly says the event kicked off October 6; the [full festival listing](https://sf.funcheap.com/city-guide/fleet-week-air-show-sf/) gives October 6-14. The September 23-October 19 gallery exhibition and October 15 ship departures do not extend the festival.
- 2021: October 3-11 is explicit in the [Port of Oakland release](https://www.portofoakland.com/oakland-international-airport-hosts-the-blue-angels-as-part-of-fleet-week).
- 2022: October 3-11 is explicit in the SF Veterans Affairs Commission annual report used in the JSON. The [organizer media program](https://fleetweeksf.org/wp-content/uploads/2022/10/2022-SFFW-Media-Program-of-Events_9.28.pdf) includes advance ship arrivals October 2 and departures October 11. Fog curtailed Saturday's Blue Angels display and cancelled Sunday's, without cancelling the festival: [post-event account](https://www.latitude38.com/lectronic/fleet-week/).
- 2023: October 2-10 follows SFMTA's complete festival notice. The shutdown threat did not become a cancellation; [October 8 reporting](https://sfstandard.com/2023/10/08/dense-fog-clings-to-san-francisco-but-fleet-week-air-show-is-still-on/) describes that year's ongoing airshow.
- 2024: October 7-14 follows SFMTA. The October 12 airshow was cut short and the Blue Angels cancelled that day's performance because of fog: [KTVU report](https://www.ktvu.com/news/blue-angels-flight-show-canceled). Do not set the whole festival to cancelled.
- 2025: October 5-13 is retained on the organizer's year-specific liberty-guide listing and corroborated by [contemporaneous festival coverage](https://www.sfgate.com/local/article/guide-san-francisco-fleet-week-2025-21079181.php). The shutdown grounded the Blue Angels, but the festival and airshow continued: [AP report](https://apnews.com/article/1e81214f7dfef837ef79f64cfc06ae6e). [Military photo documentation](https://www.dvidshub.net/image/9364199/san-francisco-fleet-week-2025) confirms Snowbirds flying on October 12.

## Burning Man Date Conflicts

- 2018: the current history timeline says August 25-September 3. The contemporaneous [official survival guide](https://survival.burningman.org/wp-content/uploads/2018/07/BMSG-2018.pdf) explicitly gives August 26-September 3; that is used. The [BLM permit reproduced in the 2019 draft EIS](https://burners.me/wp-content/uploads/2019/03/Burning_Man_Event_SRP-Draft_EIS_Vol2.pdf) independently authorizes August 26-September 3. No Saturday start is inferred from the timeline.
- 2023: the official historical span remains August 27-September 4 despite rain-related disruption. This is not a cancellation and not an estimate of when the last participant left.
- 2026: August 30-September 7 is explicit in the dated organizer ticket announcement and [2026 survival-guide travel instructions](https://survival.burningman.org/tag/travel/). A conflicting general FAQ says August 31; the dated announcement and operational guide take precedence. [Organizer September reporting](https://journal.burningman.org/2026/09/news/official-announcements/participant-passes-away-at-2026-burning-man-event/) confirms the event occurred, rather than relying solely on an advance schedule.

## Source Gaps and Limits

No annual edition was omitted for uncertain dates. Remaining limitations concern archival strength, not filled-in recurrence dates:

- CNY 2017 and 2018 use accessible Internet Archive captures of the organizer calendar; later editions use dated organizer PDFs. The 2022 PDF was available in search-index text but the browser's direct PDF open failed; [a participating band's dated listing](https://sfprideband.org/performances-and-events/chinese-new-year-parade-2022/) independently confirms February 19.
- CNY 2026 is corroborated after the event by [the broadcast partner's photo/video report](https://abc7news.com/post/photos-video-2026-san-francisco-chinese-new-year-parade/18690441/).
- Folsom 2017-2019 and 2025 use contemporary local reporting because a direct historical organizer page containing the fair date was not recovered. Organizer calendar entries were recovered for 2021-2024 and its explicit virtual page for 2020. The [official 2017 advertisement reproduced in an event guide](https://windycitytimes.com/wp-content/uploads/2017/05/IMLGUIDE_2017_web.pdf) additionally prints September 24, 2017.
- Airshow notes capture verified major cancellation exceptions, not a minute-by-minute audit of every performance, rehearsal, or weather delay.
- The dataset intentionally does not duplicate virtual Burning Man alternatives as separate annual Nevada events, nor duplicate cancelled street parades alongside their virtual replacements.
