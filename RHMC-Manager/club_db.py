"""Rebel Hounds MC Manager - SQLite storage layer."""
import json
import os
import random
import sqlite3
import time

TABLES = {
    "members":   ["name", "callsign", "rank", "status", "phone", "discord", "joined", "duesPaid", "bike", "notes"],
    "prospects": ["name", "sponsor", "recruitedBy", "stage", "since", "standing", "attendance", "nextReview", "tasks", "notes"],
    "projects":  ["title", "category", "lead", "status", "priority", "start", "deadline", "progress", "descr"],
    "tasks":     ["title", "assignedTo", "project", "priority", "status", "due", "notes"],
    "deadlines": ["title", "date", "type", "owner", "done", "notes"],
    "gangs":     ["name", "territory", "attitude", "city", "strength", "leader", "business", "weapons", "lastContact", "notes"],
    "intel":     ["subject", "category", "source", "reliability", "date", "linkedTo", "action", "details"],
    "heists":    ["name", "target", "status", "difficulty", "payout", "date", "crew", "needs", "notes"],
    "civilians": ["name", "role", "value", "contact", "lastSeen", "gang", "notes"],
    "finance":   ["date", "type", "category", "amount", "by", "notes"],
    "inventory": ["item", "category", "qty", "location", "condition", "assignedTo", "notes"],
    "bikes":     ["owner", "bike", "plate", "color", "status", "lastService", "mods", "notes"],
    "relationships": ["party_a", "party_b", "relation", "city", "since", "notes"],
}

NUMERIC = {"prospects": ["attendance"], "projects": ["progress"],
           "gangs": ["strength"], "heists": ["payout"],
           "finance": ["amount"], "inventory": ["qty"]}


_uid_counter = 0


def new_id():
    global _uid_counter
    _uid_counter += 1
    return "id-%d-%d-%d-%04x" % (int(time.time() * 1000), os.getpid() % 100000,
                                 _uid_counter, random.getrandbits(16))


class ClubDB:
    def __init__(self, path):
        self.path = path
        first = not os.path.exists(path)
        self.cx = sqlite3.connect(path)
        self.cx.row_factory = sqlite3.Row
        self._ensure()
        if first:
            self._seed()
            self._import_club_files()
        elif self.is_empty():
            self._seed()

    def _ensure(self):
        cur = self.cx.cursor()
        for table, cols in TABLES.items():
            cur.execute("CREATE TABLE IF NOT EXISTS %s (id TEXT PRIMARY KEY, %s)"
                        % (table, ", ".join(c + " TEXT" for c in cols)))
            # migrate: add columns that older databases lack
            existing = {r[1] for r in cur.execute("PRAGMA table_info(%s)" % table).fetchall()}
            for c in cols:
                if c not in existing:
                    cur.execute("ALTER TABLE %s ADD COLUMN %s TEXT" % (table, c))
        cur.execute("CREATE TABLE IF NOT EXISTS cities (id TEXT PRIMARY KEY, name TEXT)")
        if cur.execute("SELECT COUNT(*) FROM cities").fetchone()[0] == 0:
            for name in ("Vital RP", "AllProRP"):
                cur.execute("INSERT INTO cities (id, name) VALUES (?, ?)", (new_id(), name))
        cur.execute("CREATE TABLE IF NOT EXISTS settings (k TEXT PRIMARY KEY, v TEXT)")
        for k, v in (("club", "Rebel Hounds MC"), ("pass", "hounds"), ("church", "Sunday 20:00"),
                     ("sounds", "1"), ("notify_days", "3"), ("uiscale", "100")):
            cur.execute("INSERT OR IGNORE INTO settings (k, v) VALUES (?, ?)", (k, v))
        self.cx.commit()

    def is_empty(self):
        cur = self.cx.cursor()
        return all(cur.execute("SELECT COUNT(*) FROM %s" % t).fetchone()[0] == 0 for t in TABLES)

    # ---- settings ----
    def get_setting(self, k, default=""):
        row = self.cx.execute("SELECT v FROM settings WHERE k=?", (k,)).fetchone()
        return row["v"] if row else default

    def set_setting(self, k, v):
        self.cx.execute("INSERT OR REPLACE INTO settings (k, v) VALUES (?, ?)", (k, v))
        self.cx.commit()

    # ---- cities ----
    def get_cities(self):
        return [dict(r) for r in self.cx.execute("SELECT * FROM cities ORDER BY name").fetchall()]

    def add_city(self, name):
        name = (name or "").strip()
        if not name:
            return None
        if self.cx.execute("SELECT COUNT(*) FROM cities WHERE name=?", (name,)).fetchone()[0]:
            return None
        rid = new_id()
        self.cx.execute("INSERT INTO cities (id, name) VALUES (?, ?)", (rid, name))
        self.cx.commit()
        return rid

    def del_city(self, rid):
        self.cx.execute("DELETE FROM cities WHERE id=?", (rid,))
        self.cx.commit()

    # ---- crud ----
    def all(self, table):
        return [dict(r) for r in self.cx.execute("SELECT * FROM %s" % table).fetchall()]

    def add(self, table, data):
        data = dict(data)
        data["id"] = new_id()
        cols = ["id"] + TABLES[table]
        self.cx.execute("INSERT INTO %s (%s) VALUES (%s)"
                        % (table, ",".join(cols), ",".join("?" * len(cols))),
                        [str(data.get(c, "")) for c in cols])
        self.cx.commit()
        return data["id"]

    def update(self, table, rid, data):
        sets = ", ".join(c + "=?" for c in TABLES[table])
        self.cx.execute("UPDATE %s SET %s WHERE id=?" % (table, sets),
                        [str(data.get(c, "")) for c in TABLES[table]] + [rid])
        self.cx.commit()

    def delete(self, table, rid):
        self.cx.execute("DELETE FROM %s WHERE id=?" % table, (rid,))
        self.cx.commit()

    def balance(self):
        rows = self.cx.execute("SELECT type, amount FROM finance").fetchall()
        bal = 0.0
        for r in rows:
            try:
                amt = float(r["amount"] or 0)
            except ValueError:
                amt = 0.0
            bal += amt if (r["type"] or "") == "in" else -amt
        return bal

    # ---- backup ----
    def export_json(self, path):
        data = {"settings": {r["k"]: r["v"] for r in self.cx.execute("SELECT * FROM settings")}}
        for t in TABLES:
            data[t] = self.all(t)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def import_json(self, path):
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        cur = self.cx.cursor()
        for t in TABLES:
            if t in data:
                cur.execute("DELETE FROM %s" % t)
                for row in data[t]:
                    cols = ["id"] + TABLES[t]
                    cur.execute("INSERT OR REPLACE INTO %s (%s) VALUES (%s)"
                                % (t, ",".join(cols), ",".join("?" * len(cols))),
                                [str(row.get(c, "")) for c in cols])
        if "settings" in data:
            for k, v in data["settings"].items():
                cur.execute("INSERT OR REPLACE INTO settings (k, v) VALUES (?, ?)", (k, str(v)))
        self.cx.commit()

    # ---- seed ----
    def _seed(self):
        M = [
            ("Jonathan \"Jay\" Charles", "Jay", "President", "Active", "555-0101", "jayreaper", "2025-09-01", "Paid", "Harley Fat Bob", "Founder. Church Sundays."),
            ("Jason \"Escobar\" Castle", "Escobar", "Vice President", "Active", "", "d.bennett31", "2025-09-01", "Paid", "", ""),
            ("Shepard", "Sergeant Stabby", "Sergeant At Arms", "Active", "", "shepardsky", "2025-09-01", "Paid", "", "Runs security details."),
            ("Ember Davis", "Ember", "Secretary", "Active", "", "snow3976", "2025-09-01", "Paid", "", ""),
            ("William Xander Reks", "Reks", "Treasurer", "Active", "", "panda_alleyway", "2025-09-01", "Paid", "", "Holds treasury."),
            ("Olivia Newton", "Liv", "Road Captain", "Active", "", "", "2025-11-25", "Owes", "Sportster", ""),
        ]
        for m in M:
            self.add("members", dict(zip(TABLES["members"], m)))
        P = [
            ("JDavinci", "Tyrex", "Tyrex", "Prospect", "2026-05-10", "Good", "80", "2026-09-20", "Gate duty, ride support", "Strong work ethic. Consistent attendance."),
            ("Kilo", "KingSlayer", "KingSlayer", "Prospect", "2026-06-22", "Watch", "55", "2026-09-18", "Clubhouse cleanup", "New prospect. Learning the ropes."),
            ("Hangaround Tommy", "", "Jay", "Hangaround", "2026-08-15", "Good", "40", "", "", "Shows up to rides."),
        ]
        for p in P:
            self.add("prospects", dict(zip(TABLES["prospects"], p)))
        self.add("projects", {"title": "Clubhouse meth-table upgrade", "category": "Business", "lead": "Reks", "status": "Active", "priority": "High", "start": "2026-08-20", "deadline": "2026-09-25", "progress": "60", "descr": "Need 40k + supplies. Assign runners."})
        self.add("projects", {"title": "Charity ride - Grapeseed", "category": "Run / Event", "lead": "Olivia", "status": "Planning", "priority": "Normal", "start": "2026-09-05", "deadline": "2026-10-04", "progress": "20", "descr": "Route, flyers, prospect roadblock crew."})
        self.add("tasks", {"title": "Collect September dues", "assignedTo": "Reks", "project": "", "priority": "High", "status": "Doing", "due": "2026-09-15", "notes": "$500 per patch."})
        self.add("tasks", {"title": "Scout Paleto lab raid window", "assignedTo": "Shepard", "project": "", "priority": "Urgent", "status": "Todo", "due": "2026-09-12", "notes": "LEO patrol times."})
        self.add("tasks", {"title": "Fix gate camera", "assignedTo": "Kilo (prospect)", "project": "Clubhouse meth-table upgrade", "priority": "Normal", "status": "Todo", "due": "2026-09-14", "notes": ""})
        self.add("deadlines", {"title": "Church - weekly", "date": "2026-09-13", "type": "Church", "owner": "Jay", "done": "No", "notes": "Sundays"})
        self.add("deadlines", {"title": "Dues deadline", "date": "2026-09-15", "type": "Dues", "owner": "Reks", "done": "No", "notes": "$500 per patch"})
        self.add("deadlines", {"title": "Turf payment - Stab City", "date": "2026-09-20", "type": "Turf", "owner": "Shepard", "done": "No", "notes": ""})
        self.add("gangs", {"name": "The Lost MC (mirror crew)", "territory": "Stab City / Sandy", "attitude": "Tense", "city": "Vital RP", "strength": "12", "leader": "Unknown Prez", "business": "Chop shop", "weapons": "Pistols, sawed-off", "lastContact": "2026-08-28", "notes": "Bumped into us at Yellow Jack. Watching."})
        self.add("gangs", {"name": "Vagos - East LS set", "territory": "Rancho", "attitude": "Neutral", "city": "Vital RP", "strength": "20", "leader": "?", "business": "Weed runs", "weapons": "SMGs reported", "lastContact": "", "notes": "Possible gun connect. Vet before dealing."})
        self.add("relationships", {"party_a": "Rebel Hounds MC", "party_b": "Vagos - East LS set", "relation": "Trade Partners", "city": "Vital RP", "since": "2026-08-01", "notes": "Gun connect via Slick. Keep it quiet."})
        self.add("relationships", {"party_a": "Rebel Hounds MC", "party_b": "The Lost MC (mirror crew)", "relation": "Tense", "city": "Vital RP", "since": "2026-08-28", "notes": "Yellow Jack incident. No deals until it cools."})
        self.add("intel", {"subject": "Lost moving guns via Stab City docks", "category": "Gang", "source": "Informant G", "reliability": "Likely", "date": "2026-09-02", "linkedTo": "The Lost MC (mirror crew)", "action": "Verify with night watch", "details": "Two box trucks, late night, armed escort."})
        self.add("intel", {"subject": "Fleeca on Great Ocean - weak roof access", "category": "Heist", "source": "Kilo", "reliability": "Rumor", "date": "2026-09-05", "linkedTo": "", "action": "Daytime recon photos", "details": "Janitor claims back door sticks."})
        self.add("intel", {"subject": "Civilian Marta - nurse at Sandy", "category": "Civilian", "source": "Ember", "reliability": "Confirmed", "date": "2026-09-06", "linkedTo": "Marta Reyes", "action": "Keep friendly - patch-up off books", "details": "Will treat GSWs for cash."})
        self.add("heists", {"name": "Paleto Bay bonded truck", "target": "Group 6 truck, Paleto route", "status": "Planning", "difficulty": "Hard", "payout": "180000", "date": "2026-09-27", "crew": "Jay, Shepard, Escobar + driver TBD", "needs": "Hacker, getaway bikes", "notes": "Need LEO-shift intel first."})
        self.add("civilians", {"name": "Marta Reyes", "role": "Nurse - Sandy Shores", "value": "Informant", "contact": "555-7788", "lastSeen": "2026-09-06", "gang": "None", "notes": "Off-books treatment. Paid cash. Protect identity."})
        self.add("civilians", {"name": "Slick - car dealer", "role": "Dealer, Premium Deluxe", "value": "Client", "contact": "", "lastSeen": "2026-08-30", "gang": "", "notes": "Moves hot bikes, takes 15%. Reliable."})
        self.add("civilians", {"name": "Deputy R. Cole", "role": "LSSD", "value": "LEO Watch", "contact": "", "lastSeen": "2026-09-01", "gang": "LEO", "notes": "Asks questions at Yellow Jack. Do not engage."})
        self.add("finance", {"date": "2026-09-01", "type": "in", "category": "Dues", "amount": "3500", "by": "August dues", "notes": "7 patches paid"})
        self.add("finance", {"date": "2026-09-03", "type": "out", "category": "Upkeep", "amount": "1200", "by": "Reks", "notes": "Clubhouse rent + power"})
        self.add("finance", {"date": "2026-09-05", "type": "in", "category": "Business", "amount": "8200", "by": "Table run", "notes": "Split to treasury"})
        self.add("finance", {"date": "2026-09-07", "type": "out", "category": "Bikes/Parts", "amount": "900", "by": "Liv", "notes": "Sportster repairs"})
        self.add("inventory", {"item": "Pistol Ammo (box)", "category": "Ammo", "qty": "40", "location": "Clubhouse", "condition": "New", "assignedTo": "Armory", "notes": "Count weekly"})
        self.add("inventory", {"item": "Engine parts crate", "category": "Parts", "qty": "6", "location": "Storage Unit", "condition": "Good", "assignedTo": "", "notes": "For chop orders"})
        self.add("inventory", {"item": "First aid kits", "category": "Supplies", "qty": "12", "location": "Clubhouse", "condition": "New", "assignedTo": "", "notes": "Restock via Marta connect"})
        self.add("inventory", {"item": "Sawn-off (stash)", "category": "Weapons", "qty": "2", "location": "Van", "condition": "Good", "assignedTo": "Shepard", "notes": "Heist use only"})
        self.add("bikes", {"owner": "Jonathan Jay Charles", "bike": "Harley Fat Bob 114", "plate": "HOUND01", "color": "Black / red", "status": "Road Ready", "lastService": "2026-08-20", "mods": "Stage 2, apes", "notes": ""})
        self.add("bikes", {"owner": "Olivia Newton", "bike": "Sportster Iron 883", "plate": "HOUND22", "color": "Matte grey", "status": "In Shop", "lastService": "2026-09-07", "mods": "", "notes": "Waiting on forks"})
        self.add("bikes", {"owner": "Club (prospect pool)", "bike": "Bagger - spare", "plate": "HOUND99", "color": "Black", "status": "Road Ready", "lastService": "2026-07-30", "mods": "", "notes": "Loaner for prospects"})

    def _import_club_files(self):
        """Pull real roster/prospects from the club website folder if present."""
        base = os.path.dirname(os.path.abspath(self.path))
        parent = os.path.dirname(base)
        try:
            rp = os.path.join(parent, "roster.json")
            if os.path.exists(rp):
                with open(rp, encoding="utf-8") as f:
                    data = json.load(f)
                if data.get("members"):
                    self.cx.execute("DELETE FROM members")
                for m in data.get("members", []):
                    self.add("members", {
                        "name": m.get("name") or m.get("username") or "Unknown",
                        "callsign": m.get("username", ""), "rank": m.get("rank", "Full Patch"),
                        "status": m.get("status", "Active"), "phone": "", "discord": m.get("username", ""),
                        "joined": m.get("joined", ""), "duesPaid": "Owes", "bike": "",
                        "notes": ((m.get("bio") or "") + " " + (m.get("contributions") or "")).strip()})
        except Exception:
            pass
        try:
            pp = os.path.join(parent, "prospects.json")
            if os.path.exists(pp):
                with open(pp, encoding="utf-8") as f:
                    data = json.load(f)
                if data.get("prospects"):
                    self.cx.execute("DELETE FROM prospects")
                    existing = set()
                for x in data.get("prospects", []):
                    if (x.get("name") or "") in existing:
                        continue
                    self.add("prospects", {
                        "name": x.get("name", "Unknown"), "sponsor": x.get("sponsor", ""),
                        "recruitedBy": x.get("recruitedBy", ""), "stage": "Prospect",
                        "since": x.get("prospectSince", ""), "standing": x.get("standing", "Good"),
                        "attendance": "50", "nextReview": x.get("nextReview", ""), "tasks": "",
                        "notes": x.get("notes") or x.get("officerNote", "")})
        except Exception:
            pass

    def reseed(self):
        cur = self.cx.cursor()
        for t in TABLES:
            cur.execute("DELETE FROM %s" % t)
        self.cx.commit()
        self._seed()

    def wipe(self):
        cur = self.cx.cursor()
        for t in TABLES:
            cur.execute("DELETE FROM %s" % t)
        self.cx.commit()
