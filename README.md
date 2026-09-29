# Auden's Practice Day ⚾

**Play it:** https://ianmilligan1.github.io/auden-practice-day/

A browser baseball game starring **Auden Milligan, #22** of the **11U Tier 2 Waterloo Tigers**
(Waterloo Minor Baseball, Waterloo, Ontario). Before the big game against the Guelph Royals,
Auden has to put in his reps at Auburn Park.

## The drills

| # | Skill | Drill | How to play |
|---|-------|-------|-------------|
| 1 | Catching | **Pop Fly Patrol** | Get under fly balls before they land. Watch the shadow. Gold balls are worth 3, five in a row is +2. 45 seconds. |
| 2 | Batting | **Cage Crusher** | 12 pitches from Iron Mike. Swing on time for singles up to home runs. Lay off the high ones for a "good eye" point. |
| 3 | Fielding | **Grounder Gauntlet** | Auden plays short. Field the grounder, then throw to first when the needle is in the green. Beat the runner! 8 grounders. |
| 4 | Seed spitting | **Sunflower Showdown** | A dugout tradition. Lock the angle, lock the power, mind the wind. Best of 5 spits, measured in metres. |

Each drill awards up to three stars. Earn a star in every drill to make the lineup; get all 12 for Tigers MVP.
Best scores are saved in the browser.

## Controls

- **Space / Enter / click / tap**: action (start, swing, throw, spit)
- **Arrow keys / WASD** or mouse / finger: move
- **1–4**: pick a drill from the Practice Card
- **Esc**: back to the Practice Card · **M**: sound on/off

## Running it

No build step. Open `index.html` via any static server:

```bash
python3 -m http.server 8022
```

then visit http://localhost:8022.

## Files

- `index.html`, `style.css`: page shell
- `game.js`: the whole game (canvas 2D, Web Audio sound effects, no dependencies)
- `assets/tigers-logo.png`: Waterloo Tigers logo, from waterloobaseball.ca

Home field, opponents and division come from the Tigers' 2026 11U Tier 2 schedule on kwbaseball.ca.
A fan-made game, not affiliated with Waterloo Minor Baseball.
