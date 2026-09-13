# Rebel Hounds MC — Club Manager

Offline-first club management app for FiveM RP. No server needed — just open `index.html`.

## Open it
- Double-click `mc-manager/index.html`, or
- Host the `mc-manager/` folder on your existing site (e.g. `https://yoursite.com/mc-manager/`)

Default passcode: `hounds` (change in Settings).

## Modules
- 🏠 Dashboard — treasury, deadlines, tasks, latest intel
- 🎖️ Membership List — rank, status, dues, bike, file notes
- 🧷 Prospect Manager — Hangaround → Prospect → Patched board, sponsor, attendance, one-click "Patch in"
- 📋 Project Planning — progress %, lead, deadline
- ✅ Tasks — Todo / Doing / Done lanes
- ⏰ Deadlines — church, dues, turf, heists; overdue highlighting
- 💀 Gang Dossiers — attitude, turf, strength, linked intel count
- 🕵️ Intel Log — Gang / Heist / Civilian / LEO / Business, reliability, action needed
- 💰 Heists — status pipeline Intel → Executed, payout, crew, needs
- 🧍 Civilians — informants, clients, threats, LEO watch
- 💵 Finance Log — in/out ledger + balance, exportable
- 📦 Inventory Log — qty, location, low-stock flags
- 🏍️ Bike Log — owner, plate, status, service history

## Data
- Stored in browser `localStorage` (`rhmc_manager_v1`) — works offline.
- First run auto-imports `../roster.json` + `../prospects.json` if present, else loads demo seed.
- Use **Export / Import** (sidebar) for backups and sharing between officers.
- Press `/` for global search. `+ Quick Add` for fast logging during RP.
