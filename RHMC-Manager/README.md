# Rebel Hounds MC Manager — Desktop App

Real Windows program. No browser, no server, works offline.

## Run it
Double-click **`dist\RHMC_Manager.exe`**. Passcode: `hounds` (change in Settings).

## Sections
- CLUB: Dashboard · Members · Prospects (one-click Patch In) · Projects · Tasks · Deadlines · **Timer**
- INTEL: Gang Dossiers · **Gang Relations** · Intel Log · Heists · Civilians
- BUSINESS: Finance · Inventory · Bike Log
- SYSTEM: Settings

## New in this version
- **Timer with real alarm** — countdown with presets, flashing TIME! popup and looping alarm until stopped.
- **Deadline notifications** — background watcher alerts for nearing (configurable days), due-today and overdue deadlines/tasks, with sounds. Marking one done gives a "Deadline met" chime.
- **Cities / servers** — dossiers and relations are tagged per city (Vital RP, AllProRP preloaded). Add more anytime in Settings → Cities.
- **Gang Relations dossier** — who stands with whom, per city (Allied → At War).
- **Responsive minimalist UI** — scrollable views, min window size, UI scale 100/125/150% in Settings, status bar with live counts.

## Data
- Stored in `club_data.db` (SQLite) next to the exe. Old databases auto-migrate (new columns/tables added, nothing lost).
- First launch auto-loads your real `roster.json` + `prospects.json`, plus demo projects/tasks/intel/finance.
- Settings → Export/Import (JSON) for backups and sharing between officers.

## Developers
- Source: `RHMC_Manager.py` (UI) + `club_db.py` (storage). Run with `python RHMC_Manager.py`.
- Test: `python C:\Users\Jayt1\AppData\Local\Temp\opencode\smoke.py`
- Rebuild exe: `pyinstaller --noconfirm --onefile --windowed --name RHMC_Manager RHMC_Manager.py`
