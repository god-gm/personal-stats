# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

**gods-of-death-monitor** — a React + Vite SPA that shows raid performance stats for the "Gods of Death" gaming guild. Players log in via Discord OAuth2 and see their personal vs. guild-average damage scores per boss encounter in the current season.

## Commands

```bash
npm run dev       # dev server on :5173 (proxies /api → localhost:8080)
npm run build     # production build to dist/
npm run preview   # serve the built dist/
npm run lint      # ESLint
```

No test suite is configured.

## Environment variables

Copy and fill in `.env` for local dev (already in `.gitignore`):

```
VITE_API_BASE_URL=http://localhost:8080     # backend; omit to use default
VITE_DISCORD_CLIENT_ID=<your client id>
VITE_DISCORD_REDIRECT_URI=http://localhost:5173/auth/callback
```

`.env.production` only overrides `VITE_API_BASE_URL` for the production build.

## Architecture

### Auth flow
1. `LoginPage` redirects the browser to Discord OAuth2 with `scope: identify`.
2. Discord redirects back to `/auth/callback?code=…`.
3. `AuthCallbackPage` POSTs the code to `POST /api/auth/discord/callback`.
4. On success the backend returns `{ status: 'OK', data: { token, userGameName } }`.
5. `jwt_token` and `user_game_name` are stored in `localStorage`; user is sent to `/dashboard`.

`PrivateRoute` in `App.jsx` guards `/dashboard` by checking `localStorage.jwt_token`. A 401 from the API also kicks the user back to `/`.

### API client (`src/api/client.js`)
Thin `fetch` wrapper. Reads `VITE_API_BASE_URL`, auto-attaches `Authorization: Bearer <token>` from localStorage. All responses are expected as `{ status: string, data?: any, message?: string }`. Throws `{ status, message }` on non-2xx.

Exported functions: `login` (unused in current UI), `discordCallback`, `getCurrentSeason`.

### Dashboard data shape
`GET /api/raid/current-season` returns:

```json
{
  "status": "OK",
  "data": {
    "season": "S1",
    "totalTokensUsed": 12,
    "totalBombsUsed": 3,
    "bossGroups": [
      {
        "set": "A", "type": "main", "label": "SET A",
        "bossName": "Dragon Lord",
        "encounters": [
          {
            "unitId": "...",
            "name": "Dragon Lord",
            "encounterType": "Main",
            "playerAttackCount": 5,
            "playerAverage": 1200000,
            "guildAverage": 980000,
            "performanceIndicator": "above"  // "above" | "average" | "below"
          }
        ]
      }
    ]
  }
}
```

### Component hierarchy
```
DashboardPage
  └─ BossGroupCard (one per bossGroup, collapsible)
       ├─ PerformanceIndicator  (for the Main encounter)
       └─ enc-mini cards (Side encounters)
            └─ PerformanceIndicator
```

`EncounterRow` exists as a table-row alternative to the card layout but is **not currently used** — it was an earlier design.

`PerformanceIndicator` maps `"above" | "average" | "below"` to `▲ / ▬ / ▼` with coloured CSS classes.

### Styling
Each component and page has a co-located `.css` file. No CSS framework — plain custom properties and BEM-ish class names. Global reset and CSS variables are in `src/index.css`.
