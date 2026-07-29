# Royal Rangers Scorecard

A mobile-first web app for scoring 3-team, round-robin indoor cricket tournaments. Built with React + Vite.

## Features

- **3-team round robin** — Set up 3 teams, play each match, auto-generated standings
- **Ball-by-ball scoring** — Runs, wickets, extras (WD, NB, B, LB), run-outs with full undo/redo
- **Batsman & bowler stats** — Track strike rates, averages, bowling figures, economy in real time
- **Flexible overs** — Choose 5 or 6 balls per over
- **Target tracking** — Live required runs, balls remaining, auto-detected results
- **Tournament recap** — Points table, Orange Cap (most runs), Purple Cap (most wickets), MVP
- **Export** — Printable PDF scorecard & WhatsApp-ready text summary
- **Dark theme** — Night-optimized UI built for mobile

## Tech Stack

React 18, Vite 5, JavaScript (ES Modules), CSS3

## Getting Started

```bash
npm install
npm run dev
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Build production bundle to `dist/` |
| `npm run preview` | Preview the production build locally |

## Deployment

The app is fully client-side — no backend required. Serve the `dist/` folder from any static host. A pre-built copy lives in `docs/` for GitHub Pages.
