"""Rebel Hounds MC Manager - desktop app (Tkinter)."""
import datetime
import os
import sys
import threading
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

try:
    import winsound
    HAS_SOUND = True
except ImportError:  # non-Windows dev machines
    winsound = None
    HAS_SOUND = False

from club_db import ClubDB

# ---------- theme: CLUBHOUSE NOIR ----------
# Matte black, blood red, old gold. All colours live here — tweak in one place.
BG = "#0e0e11"        # app background (matte black)
PANEL = "#16161a"     # cards / sidebar
PANEL2 = "#232329"    # buttons / headers
INK = "#0b0b0d"       # deep inset (entries, lists, ticker)
FG = "#ececec"
MUTED = "#8f8f99"
BORDER = "#2b2b32"
RED = "#c0392b"       # blood red (primary)
RED_DARK = "#7b241c"  # dried blood (selections, active nav)
GREEN = "#27ae60"
GOLD = "#d4a017"      # old gold (accents, ticker)
GOLD_DIM = "#8a6a10"

RANKS = ["President", "Vice President", "Sergeant At Arms", "Secretary",
         "Treasurer", "Road Captain", "Enforcer", "Full Patch",
         "Tailgunner", "Nomad", "Life Member", "Hangaround"]

FIELDS = {
    "members": [("name", "Road name", "text", None, 1), ("callsign", "Callsign / AKA", "text", None, 0),
                ("rank", "Rank", "select", RANKS, 0), ("status", "Status", "select", ["Active", "Inactive", "Retired", "Out Bad"], 0),
                ("phone", "Phone", "text", None, 0), ("discord", "Discord", "text", None, 0),
                ("joined", "Patched date", "date", None, 0), ("duesPaid", "Dues", "select", ["Paid", "Owes", "Exempt"], 0),
                ("bike", "Bike", "text", None, 0), ("notes", "Notes / file", "area", None, 0)],
    "prospects": [("name", "Name", "text", None, 1), ("sponsor", "Sponsor", "text", None, 0),
                  ("recruitedBy", "Recruited by", "text", None, 0),
                  ("stage", "Stage", "select", ["Hangaround", "Prospect", "Patched", "Dropped"], 0),
                  ("since", "Since", "date", None, 0),
                  ("standing", "Standing", "select", ["Good", "Watch", "Shaky", "Bad"], 0),
                  ("attendance", "Attendance %", "number", None, 0), ("nextReview", "Next review", "date", None, 0),
                  ("tasks", "Assigned tasks", "text", None, 0), ("notes", "Officer notes", "area", None, 0)],
    "projects": [("title", "Project title", "text", None, 1),
                 ("category", "Category", "select", ["Business", "Run / Event", "Clubhouse", "Recruitment", "Intel Op", "Other"], 0),
                 ("lead", "Lead", "text", None, 0),
                 ("status", "Status", "select", ["Planning", "Active", "On Hold", "Done"], 0),
                 ("priority", "Priority", "select", ["Low", "Normal", "High", "Urgent"], 0),
                 ("start", "Start", "date", None, 0), ("deadline", "Deadline", "date", None, 0),
                 ("progress", "Progress %", "number", None, 0), ("descr", "Details / plan", "area", None, 0)],
    "tasks": [("title", "Task", "text", None, 1), ("assignedTo", "Assigned to", "text", None, 0),
              ("project", "Related project", "text", None, 0),
              ("priority", "Priority", "select", ["Low", "Normal", "High", "Urgent"], 0),
              ("status", "Status", "select", ["Todo", "Doing", "Done"], 0),
              ("due", "Due date", "date", None, 0), ("notes", "Notes", "area", None, 0)],
    "deadlines": [("title", "Deadline", "text", None, 1), ("date", "Date", "date", None, 0),
                  ("type", "Type", "select", ["Church", "Dues", "Event", "Heist", "Turf", "Other"], 0),
                  ("owner", "Owner", "text", None, 0),
                  ("done", "Completed", "select", ["No", "Yes"], 0), ("notes", "Notes", "text", None, 0)],
    "gangs": [("name", "Gang / crew", "text", None, 1), ("territory", "Turf", "text", None, 0),
              ("attitude", "Attitude", "select", ["Allied", "Neutral", "Tense", "Hostile", "At War"], 0),
              ("strength", "Est. numbers", "number", None, 0), ("leader", "Leader(s)", "text", None, 0),
              ("business", "Businesses", "text", None, 0), ("weapons", "Firepower", "text", None, 0),
              ("lastContact", "Last contact", "date", None, 0), ("city", "City / server", "select", "cities", 0), ("notes", "Dossier notes", "area", None, 0)],
    "relationships": [("party_a", "Party A (gang / crew)", "text", None, 1), ("party_b", "Party B", "text", None, 0),
                      ("relation", "Relationship", "select", ["Allied", "Trade Partners", "Neutral", "Tense", "Truce", "Hostile", "At War"], 0),
                      ("city", "City / server", "select", "cities", 0),
                      ("since", "Since", "date", None, 0), ("notes", "Notes", "area", None, 0)],
    "intel": [("subject", "Subject", "text", None, 1),
              ("category", "Category", "select", ["Gang", "Heist", "Civilian", "LEO", "Business", "Other"], 0),
              ("source", "Source", "text", None, 0),
              ("reliability", "Reliability", "select", ["Confirmed", "Likely", "Rumor", "Unverified"], 0),
              ("date", "Date gathered", "date", None, 0), ("linkedTo", "Linked gang / person", "text", None, 0),
              ("action", "Action needed", "text", None, 0), ("details", "Details", "area", None, 0)],
    "heists": [("name", "Heist / job", "text", None, 1), ("target", "Target", "text", None, 0),
               ("status", "Status", "select", ["Intel", "Planning", "Ready", "Executed", "Burned"], 0),
               ("difficulty", "Difficulty", "select", ["Easy", "Medium", "Hard", "Military"], 0),
               ("payout", "Est. payout $", "number", None, 0), ("date", "Planned date", "date", None, 0),
               ("crew", "Crew", "text", None, 0), ("needs", "Still needed", "text", None, 0),
               ("notes", "Plan / notes", "area", None, 0)],
    "civilians": [("name", "Name / alias", "text", None, 1), ("role", "Occupation", "text", None, 0),
                  ("value", "Value", "select", ["Informant", "Client", "Neutral", "Threat", "LEO Watch"], 0),
                  ("contact", "Contact", "text", None, 0), ("lastSeen", "Last seen", "date", None, 0),
                  ("gang", "Affiliation", "text", None, 0), ("notes", "Notes", "area", None, 0)],
    "finance": [("date", "Date", "date", None, 0),
                ("type", "Type", "select", ["in", "out"], 0),
                ("category", "Category", "select", ["Dues", "Heist Cut", "Business", "Donation", "Upkeep", "Bikes/Parts", "Weapons", "Event", "Other"], 0),
                ("amount", "Amount $", "number", None, 1), ("by", "By / for", "text", None, 0),
                ("notes", "Notes", "text", None, 0)],
    "inventory": [("item", "Item", "text", None, 1),
                  ("category", "Category", "select", ["Weapons", "Ammo", "Parts", "Supplies", "Cut / Gear", "Vehicles", "Other"], 0),
                  ("qty", "Qty", "number", None, 0),
                  ("location", "Location", "select", ["Clubhouse", "Storage Unit", "Van", "Member Holding", "Other"], 0),
                  ("condition", "Condition", "select", ["New", "Good", "Worn", "Broken"], 0),
                  ("assignedTo", "Held by", "text", None, 0), ("notes", "Notes", "text", None, 0)],
    "bikes": [("owner", "Owner", "text", None, 1), ("bike", "Make / model", "text", None, 0),
              ("plate", "Plate", "text", None, 0), ("color", "Color", "text", None, 0),
              ("status", "Status", "select", ["Road Ready", "In Shop", "Wrecked", "Impounded", "Sold"], 0),
              ("lastService", "Last service", "date", None, 0), ("mods", "Mods", "text", None, 0),
              ("notes", "Notes", "area", None, 0)],
}

COLUMNS = {
    "members": [("name", "Name", 200), ("rank", "Rank", 130), ("status", "Status", 80), ("duesPaid", "Dues", 70), ("phone", "Phone", 100), ("bike", "Bike", 130), ("joined", "Patched", 90)],
    "prospects": [("name", "Name", 150), ("stage", "Stage", 100), ("sponsor", "Sponsor", 120), ("standing", "Standing", 80), ("attendance", "Att%", 50), ("since", "Since", 90), ("nextReview", "Review", 90)],
    "projects": [("title", "Project", 240), ("status", "Status", 90), ("priority", "Pri", 70), ("lead", "Lead", 110), ("deadline", "Deadline", 90), ("progress", "%", 45)],
    "tasks": [("title", "Task", 260), ("status", "Status", 80), ("priority", "Pri", 70), ("assignedTo", "Who", 120), ("due", "Due", 90)],
    "deadlines": [("title", "Deadline", 260), ("date", "Date", 90), ("type", "Type", 90), ("owner", "Owner", 110), ("done", "Done", 60)],
    "gangs": [("name", "Gang", 200), ("attitude", "Attitude", 90), ("territory", "Turf", 150), ("strength", "~Deep", 60), ("leader", "Leader", 130), ("business", "Business", 130), ("lastContact", "Contact", 90), ("city", "City", 90)],
    "relationships": [("party_a", "Party A", 170), ("relation", "Relation", 110), ("party_b", "Party B", 170), ("city", "City", 100), ("since", "Since", 90), ("notes", "Notes", 220)],
    "intel": [("subject", "Subject", 280), ("category", "Cat", 80), ("reliability", "Reliab.", 90), ("date", "Date", 90), ("source", "Source", 110)],
    "heists": [("name", "Heist", 200), ("status", "Status", 90), ("target", "Target", 180), ("payout", "Payout $", 90), ("date", "Date", 90)],
    "civilians": [("name", "Name", 170), ("value", "Value", 100), ("role", "Role", 170), ("lastSeen", "Seen", 90), ("contact", "Contact", 110)],
    "finance": [("date", "Date", 90), ("type", "In/Out", 70), ("category", "Category", 110), ("amount", "Amount $", 100), ("by", "By/For", 140), ("notes", "Notes", 200)],
    "inventory": [("item", "Item", 220), ("qty", "Qty", 50), ("category", "Cat", 100), ("location", "Where", 110), ("condition", "Cond", 80), ("assignedTo", "Held by", 110)],
    "bikes": [("owner", "Owner", 170), ("bike", "Bike", 170), ("plate", "Plate", 90), ("status", "Status", 100), ("lastService", "Service", 90)],
}

FILTERS = {
    "members": [("rank", "Rank", [""] + RANKS), ("status", "Status", ["", "Active", "Inactive", "Retired", "Out Bad"])],
    "prospects": [("stage", "Stage", ["", "Hangaround", "Prospect", "Patched", "Dropped"])],
    "projects": [("status", "Status", ["", "Planning", "Active", "On Hold", "Done"])],
    "tasks": [("status", "Status", ["", "Todo", "Doing", "Done"]), ("priority", "Priority", ["", "Low", "Normal", "High", "Urgent"])],
    "gangs": [("attitude", "Attitude", ["", "Allied", "Neutral", "Tense", "Hostile", "At War"]), ("city", "City", "cities")],
    "relationships": [("relation", "Relation", ["", "Allied", "Trade Partners", "Neutral", "Tense", "Truce", "Hostile", "At War"]), ("city", "City", "cities")],
    "intel": [("category", "Category", ["", "Gang", "Heist", "Civilian", "LEO", "Business", "Other"])],
    "heists": [("status", "Status", ["", "Intel", "Planning", "Ready", "Executed", "Burned"])],
    "civilians": [("value", "Value", ["", "Informant", "Client", "Neutral", "Threat", "LEO Watch"])],
    "finance": [("type", "Type", ["", "in", "out"])],
    "inventory": [("category", "Category", ["", "Weapons", "Ammo", "Parts", "Supplies", "Cut / Gear", "Vehicles", "Other"])],
    "bikes": [("status", "Status", ["", "Road Ready", "In Shop", "Wrecked", "Impounded", "Sold"])],
    "deadlines": [],
}

NAV = [("dashboard", "Dashboard"), ("members", "Members"), ("prospects", "Prospects"),
       ("projects", "Projects"), ("tasks", "Tasks"), ("deadlines", "Deadlines"), ("timer", "Timer"),
       ("gangs", "Gang Dossiers"), ("relationships", "Relations"), ("intel", "Intel Log"), ("heists", "Heists"),
       ("civilians", "Civilians"), ("finance", "Finance"), ("inventory", "Inventory"),
       ("bikes", "Bike Log"), ("settings", "Settings")]

# Sidebar organisation: section header -> view keys
NAV_GROUPS = [("CLUB", ["dashboard", "members", "prospects", "projects", "tasks", "deadlines", "timer"]),
              ("INTEL", ["gangs", "relationships", "intel", "heists", "civilians"]),
              ("BUSINESS", ["finance", "inventory", "bikes"]),
              ("SYSTEM", ["settings"])]
NAV_TITLES = dict(NAV)

# Per-view header: title + motto line
VIEW_INFO = {
    "members": ("Members", "Patched roster — ranks, dues, files"),
    "prospects": ("Prospects", "Hangaround → Prospect → Patch pipeline"),
    "projects": ("Projects", "Club business planning"),
    "tasks": ("Tasks", "Who does what, by when"),
    "deadlines": ("Deadlines", "Church, dues, turf — nothing slips"),
    "gangs": ("Gang Dossiers", "Know your neighbours"),
    "relationships": ("Gang Relations", "Who stands with whom — per city"),
    "intel": ("Intel Log", "Ears open, mouth shut"),
    "heists": ("Heists", "Scores on the board"),
    "civilians": ("Civilians", "Friends, clients, problems"),
    "finance": ("Finance", "Every dollar accounted"),
    "inventory": ("Inventory", "Guns, parts, supplies"),
    "bikes": ("Bike Log", "Keep the iron running"),
}


def base_dir():
    if getattr(sys, "frozen", False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))


def days_until(datestr):
    try:
        d = datetime.date.fromisoformat((datestr or "")[:10])
        return (d - datetime.date.today()).days
    except ValueError:
        return None


def money(n):
    try:
        return "$%s" % f"{float(n or 0):,.0f}"
    except (ValueError, TypeError):
        return "$0"


# ---------- animation engine ----------
def _alive(w):
    try:
        return bool(w.winfo_exists())
    except Exception:
        return False


def fade(win, frm=0.0, to=1.0, ms=220, done=None):
    """Animate window transparency (Windows)."""
    try:
        steps = max(1, int(ms / 16))

        def tick(i=0):
            if not _alive(win):
                return
            win.attributes("-alpha", frm + (to - frm) * (i / steps))
            if i < steps:
                win.after(16, tick, i + 1)
            elif done:
                done()
        tick()
    except Exception:
        if done:
            done()


def shake(win, dist=10, ms=300):
    """Rattle a window side to side (wrong passcode)."""
    try:
        x0, y0 = win.winfo_x(), win.winfo_y()
        steps = max(1, int(ms / 25))

        def tick(i=0):
            if not _alive(win):
                return
            off = int(dist * (1 - i / steps) * (1 if i % 2 == 0 else -1))
            try:
                win.geometry("+%d+%d" % (x0 + off, y0))
            except Exception:
                pass
            if i < steps:
                win.after(25, tick, i + 1)
        tick()
    except Exception:
        pass


def count_up(label, target, fmt, ms=600):
    """Animate a number counting up to target."""
    try:
        target = float(target)
        steps = max(1, int(ms / 20))

        def tick(i=1):
            if not _alive(label):
                return
            try:
                label.config(text=fmt(target * i / steps))
            except Exception:
                pass
            if i < steps:
                label.after(20, tick, i + 1)
            else:
                try:
                    label.config(text=fmt(target))
                except Exception:
                    pass
        tick()
    except Exception:
        pass


def slide_indicator(bar, target_y, ms=160):
    """Glide the sidebar indicator to a new y position."""
    try:
        start = bar.winfo_y()
        steps = max(1, int(ms / 16))

        def tick(i=1):
            if not _alive(bar):
                return
            try:
                bar.place_configure(y=start + (target_y - start) * i / steps)
            except Exception:
                return
            if i < steps:
                bar.after(16, tick, i + 1)
        tick()
    except Exception:
        pass


# ---------- sound + shared state ----------
ACTIVE = {"db": None}  # live ClubDB handle, set at startup


def sounds_on():
    try:
        return ACTIVE["db"].get_setting("sounds", "1") == "1"
    except Exception:
        return True


def _beep(freq, ms):
    if HAS_SOUND and sounds_on():
        try:
            winsound.Beep(freq, ms)
        except Exception:
            pass


def play_chime():
    """Soft two-tone ping for minor notices."""
    threading.Thread(target=lambda: (_beep(660, 150), _beep(880, 200)), daemon=True).start()


def play_urgent():
    """Sharp triple-beep, fired once, for overdue items."""
    def run():
        for f, ms in ((880, 220), (880, 220), (1175, 420)):
            if _alarm_stop.is_set():
                return
            _beep(f, ms)
    threading.Thread(target=run, daemon=True).start()


_alarm_stop = threading.Event()


def start_alarm():
    """Looping alarm (for the timer) until stop_alarm() is called."""
    _alarm_stop.clear()

    def run():
        while not _alarm_stop.is_set():
            for f, ms in ((880, 250), (880, 250), (1175, 450)):
                if _alarm_stop.is_set():
                    return
                _beep(f, ms)
            _alarm_stop.wait(0.7)
    threading.Thread(target=run, daemon=True).start()


def stop_alarm():
    _alarm_stop.set()


def city_names():
    try:
        names = [c["name"] for c in ACTIVE["db"].all("cities")]
        return names or ["Vital RP", "AllProRP"]
    except Exception:
        return ["Vital RP", "AllProRP"]


# ---------- editor dialog ----------
class EditorDialog(tk.Toplevel):
    def __init__(self, parent, title, table, record=None):
        super().__init__(parent)
        self._table = table
        self.title(title)
        self.configure(bg=BG)
        self.resizable(True, True)
        self.result = None
        self.widgets = {}
        frm = tk.Frame(self, bg=BG, padx=14, pady=12)
        frm.pack(fill="both", expand=True)
        r = 0
        for key, label, kind, opts, req in FIELDS[table]:
            val = (record or {}).get(key, "")
            tk.Label(frm, text=label + (" *" if req else ""), bg=BG, fg=MUTED,
                     font=("Segoe UI", 8, "bold")).grid(row=r, column=0, sticky="w", pady=(6, 0))
            r += 1
            if kind == "select":
                vals = city_names() if opts == "cities" else (opts() if callable(opts) else (opts or []))
                cb = ttk.Combobox(frm, values=vals, width=40)
                cb.set(val)
                cb.grid(row=r, column=0, sticky="ew", pady=2)
                self.widgets[key] = cb
            elif kind == "area":
                t = tk.Text(frm, height=4, width=45, bg=INK, fg=FG, insertbackground=FG,
                            relief="flat", font=("Segoe UI", 10))
                t.insert("1.0", val)
                t.grid(row=r, column=0, sticky="ew", pady=2)
                self.widgets[key] = t
            else:
                e = tk.Entry(frm, width=45, bg=INK, fg=FG, insertbackground=FG, relief="flat",
                             font=("Segoe UI", 10))
                e.insert(0, val)
                if kind == "date" and not val:
                    e.insert(0, "")
                e.grid(row=r, column=0, sticky="ew", pady=2, ipady=4)
                self.widgets[key] = e
            r += 1
        frm.columnconfigure(0, weight=1)
        btns = tk.Frame(self, bg=BG, padx=14, pady=10)
        btns.pack(fill="x")
        tk.Button(btns, text="Save", bg=RED, fg="white", relief="flat", padx=18, pady=4,
                  command=self._ok, font=("Segoe UI", 10, "bold")).pack(side="right")
        tk.Button(btns, text="Cancel", bg=PANEL2, fg=FG, relief="flat", padx=14, pady=4,
                  command=self.destroy, font=("Segoe UI", 10)).pack(side="right", padx=8)
        self.bind("<Escape>", lambda e: self.destroy())
        try:
            self.attributes("-alpha", 0.0)
            fade(self, 0.0, 1.0, 180)
        except Exception:
            pass
        self.transient(parent)
        self.grab_set()
        self.wait_window(self)

    def _ok(self):
        out = {}
        table = self._table
        for key, label, kind, opts, req in FIELDS[table]:
            w = self.widgets[key]
            v = w.get("1.0", "end-1c").strip() if kind == "area" else w.get().strip()
            if req and not v:
                messagebox.showwarning("Required", label + " is required.", parent=self)
                return
            out[key] = v
        self.result = out
        self.destroy()


def open_editor(parent, table, record=None):
    dlg = EditorDialog(parent, ("Edit " if record else "New ") + table[:-1].title(), table, record)
    return dlg.result


# ---------- generic list view ----------
class ListView(tk.Frame):
    def __init__(self, parent, app, table):
        super().__init__(parent, bg=BG)
        self.app = app
        self.table = table
        self.db = app.db
        self.ids = []

        hdr = tk.Frame(self, bg=BG)
        hdr.pack(fill="x", padx=8, pady=(8, 0))
        _t, _s = VIEW_INFO.get(table, (table.title(), ""))
        tk.Label(hdr, text=_t.upper(), bg=BG, fg=FG,
                 font=("Segoe UI", 13, "bold")).pack(side="left")
        tk.Label(hdr, text=_s, bg=BG, fg=GOLD_DIM,
                 font=("Segoe UI", 9, "italic")).pack(side="left", padx=12)
        tk.Frame(self, bg=BORDER, height=1).pack(fill="x", padx=8, pady=(6, 0))

        bar = tk.Frame(self, bg=BG)
        bar.pack(fill="x", padx=8, pady=(8, 4))
        tk.Label(bar, text="Search:", bg=BG, fg=MUTED).pack(side="left")
        self.search = tk.Entry(bar, width=28, bg=INK, fg=FG, insertbackground=FG, relief="flat")
        self.search.pack(side="left", padx=6, ipady=4)
        self.search.bind("<KeyRelease>", lambda e: self.refresh())
        self.fvars = {}
        self.city_boxes = {}
        for field, label, opts in FILTERS.get(table, []):
            tk.Label(bar, text=label + ":", bg=BG, fg=MUTED).pack(side="left", padx=(8, 0))
            var = tk.StringVar(value="")
            values = ([""] + city_names()) if opts == "cities" else opts
            cb = ttk.Combobox(bar, textvariable=var, values=values, width=12, state="readonly")
            cb.pack(side="left", padx=4)
            cb.bind("<<ComboboxSelected>>", lambda e: self.refresh())
            self.fvars[field] = var
            if opts == "cities":
                self.city_boxes[field] = (var, cb)
        tk.Button(bar, text="+ Add", bg=RED, fg="white", relief="flat", padx=12,
                  command=self.add_rec).pack(side="right")
        if table == "prospects":
            tk.Button(bar, text="Patch In", bg=GREEN, fg="white", relief="flat", padx=10,
                      command=self.patch_in).pack(side="right", padx=6)
        if table == "tasks":
            tk.Button(bar, text="Toggle Done", bg=PANEL2, fg=FG, relief="flat", padx=10,
                      command=self.toggle_task).pack(side="right", padx=6)
        if table == "finance":
            self.bal_lbl = tk.Label(bar, text="", bg=BG, fg=GREEN, font=("Segoe UI", 11, "bold"))
            self.bal_lbl.pack(side="right", padx=10)

        cols = [c[0] for c in COLUMNS[table]]
        self.tree = ttk.Treeview(self, columns=cols, show="headings", selectmode="browse", height=22)
        for key, head, w in COLUMNS[table]:
            self.tree.heading(key, text=head)
            self.tree.column(key, width=w, anchor="w")
        vsb = ttk.Scrollbar(self, orient="vertical", command=self.tree.yview)
        hsb = ttk.Scrollbar(self, orient="horizontal", command=self.tree.xview)
        self.tree.configure(yscrollcommand=vsb.set, xscrollcommand=hsb.set)
        self.tree.pack(side="left", fill="both", expand=True, padx=(8, 0), pady=4)
        vsb.pack(side="left", fill="y", pady=4)
        hsb.pack(side="bottom", fill="x", padx=8)
        self.tree.bind("<Double-1>", lambda e: self.edit_rec())
        self.tree.tag_configure("over", background="#3d1512")
        self.tree.tag_configure("soon", background="#3a2f10")

        bbox = tk.Frame(self, bg=BG)
        bbox.pack(fill="x", padx=8, pady=6)
        tk.Button(bbox, text="Edit", bg=PANEL2, fg=FG, relief="flat", padx=14,
                  command=self.edit_rec).pack(side="left")
        tk.Button(bbox, text="Delete", bg=PANEL2, fg="#e74c3c", relief="flat", padx=14,
                  command=self.del_rec).pack(side="left", padx=8)
        self.count = tk.Label(bbox, text="", bg=BG, fg=MUTED)
        self.count.pack(side="right")

    def rows(self):
        recs = self.db.all(self.table)
        q = self.search.get().strip().lower()
        if q:
            recs = [r for r in recs if q in " ".join(str(v) for v in r.values()).lower()]
        for f, var in self.fvars.items():
            if var.get():
                recs = [r for r in recs if (r.get(f) or "") == var.get()]
        if self.table in ("deadlines", "tasks", "projects", "intel", "finance"):
            recs.sort(key=lambda r: (r.get("date") or r.get("due") or r.get("deadline") or "9999"), reverse=(self.table in ("intel", "finance")))
        return recs

    def refresh(self):
        for fld, (var, cb) in self.city_boxes.items():
            names = [""] + city_names()
            try:
                cb.config(values=names)
                if var.get() not in names:
                    var.set("")
            except Exception:
                pass
        for i in self.tree.get_children():
            self.tree.delete(i)
        self.ids = []
        recs = self.rows()
        data = []
        for r in recs:
            vals = []
            for key, _h, _w in COLUMNS[self.table]:
                v = r.get(key, "")
                if self.table == "finance" and key == "amount":
                    v = money(v)
                vals.append(v)
            data.append((vals, self._tag(r), r["id"]))
        self.count.config(text="%d record(s)" % len(data))
        if self.table == "finance":
            self.bal_lbl.config(text="Balance: " + money(self.db.balance()))
        self._stagger(data, 0)

    def _stagger(self, data, i):
        """Cascade rows in a few at a time for an animated entrance."""
        if not _alive(self.tree):
            return
        try:
            for _ in range(6):
                if i >= len(data):
                    break
                vals, tag, rid = data[i]
                self.tree.insert("", "end", values=vals, tags=(tag,) if tag else ())
                self.ids.append(rid)
                i += 1
            if i < len(data):
                self.after(10, self._stagger, data, i)
        except Exception:
            pass

    def _tag(self, r):
        d = r.get("date") or r.get("due") or r.get("deadline") or ""
        done = (r.get("done") or r.get("status") or "")
        if done in ("Yes", "Done"):
            return ""
        n = days_until(d)
        if n is None:
            return ""
        if n < 0:
            return "over"
        if n <= 3:
            return "soon"
        return ""

    def selected(self):
        sel = self.tree.selection()
        if not sel:
            messagebox.showinfo("Select", "Select a row first.", parent=self)
            return None
        return self.ids[self.tree.index(sel[0])]

    def add_rec(self):
        data = open_editor(self, self.table)
        if data:
            self.db.add(self.table, data)
            self.refresh()
            self.app.toast("Saved")

    def edit_rec(self):
        rid = self.selected()
        if not rid:
            return
        rec = next((r for r in self.db.all(self.table) if r["id"] == rid), None)
        data = open_editor(self, self.table, rec)
        if data:
            if self.table == "deadlines":
                was = (rec.get("done") == "Yes")
            elif self.table == "tasks":
                was = (rec.get("status") == "Done")
            else:
                was = True
            self.db.update(self.table, rid, data)
            if self.table == "deadlines":
                now = (data.get("done") == "Yes")
            elif self.table == "tasks":
                now = (data.get("status") == "Done")
            else:
                now = True
            self.refresh()
            if now and not was:
                self.app.toast("Deadline met ✓")
                play_chime()

    def del_rec(self):
        rid = self.selected()
        if not rid:
            return
        if messagebox.askyesno("Delete", "Delete this record?", parent=self):
            self.db.delete(self.table, rid)
            self.refresh()
            self.app.toast("Deleted")

    def patch_in(self):
        rid = self.selected()
        if not rid:
            return
        rec = next((r for r in self.db.all("prospects") if r["id"] == rid), None)
        if rec and messagebox.askyesno("Patch in", "Patch %s in as Full Patch member?" % rec.get("name"), parent=self):
            rec["stage"] = "Patched"
            self.db.update("prospects", rid, rec)
            self.db.add("members", {"name": rec.get("name", ""), "callsign": "", "rank": "Full Patch",
                                    "status": "Active", "phone": "", "discord": "",
                                    "joined": datetime.date.today().isoformat(), "duesPaid": "Owes",
                                    "bike": "", "notes": "Patched from prospect. Sponsor: " + rec.get("sponsor", "")})
            self.refresh()
            self.app.toast("%s patched in!" % rec.get("name", ""))

    def toggle_task(self):
        rid = self.selected()
        if not rid:
            return
        rec = next((r for r in self.db.all("tasks") if r["id"] == rid), None)
        if rec:
            became_done = rec.get("status") != "Done"
            rec["status"] = "Done" if became_done else "Todo"
            self.db.update("tasks", rid, rec)
            self.refresh()
            if became_done:
                self.app.toast("Task done ✓")
                play_chime()


# ---------- scrollable frame (keeps views usable at any window size) ----------
class ScrollableFrame(tk.Frame):
    def __init__(self, parent):
        super().__init__(parent, bg=BG)
        cv = tk.Canvas(self, bg=BG, highlightthickness=0)
        vsb = ttk.Scrollbar(self, orient="vertical", command=cv.yview)
        inner = tk.Frame(cv, bg=BG)
        inner.bind("<Configure>", lambda e: cv.configure(scrollregion=cv.bbox("all")))
        cv.create_window((0, 0), window=inner, anchor="nw")
        cv.configure(yscrollcommand=vsb.set)
        cv.pack(side="left", fill="both", expand=True)
        vsb.pack(side="right", fill="y")
        cv.bind("<Configure>", lambda e: cv.itemconfig(cv.find_all()[0], width=e.width) if cv.find_all() else None)

        def _wheel(ev):
            try:
                cv.yview_scroll(-1 if ev.delta > 0 else 1, "units")
            except Exception:
                pass
        inner.bind("<Enter>", lambda e: cv.bind_all("<MouseWheel>", _wheel))
        inner.bind("<Leave>", lambda e: cv.unbind_all("<MouseWheel>"))
        self.inner = inner


# ---------- dashboard ----------
class Dashboard(ScrollableFrame):
    def __init__(self, parent, app):
        ScrollableFrame.__init__(self, parent)
        self.app = app
        self.stats = tk.Frame(self.inner, bg=BG)
        self.stats.pack(fill="x", padx=8, pady=8)
        self.stat_lbls = []
        for _ in range(6):
            f = tk.Frame(self.stats, bg=PANEL)
            f.pack(side="left", padx=4, expand=True, fill="x")
            tk.Frame(f, bg=GOLD_DIM, height=3).pack(fill="x")
            inner = tk.Frame(f, bg=PANEL, padx=12, pady=10)
            inner.pack(fill="both", expand=True)
            n = tk.Label(inner, text="-", bg=PANEL, fg=FG, font=("Segoe UI", 18, "bold"))
            n.pack()
            l = tk.Label(inner, text="", bg=PANEL, fg=MUTED, font=("Segoe UI", 8))
            l.pack()
            self.stat_lbls.append((n, l))
        self.tick = tk.Canvas(self.inner, bg=INK, height=26, highlightthickness=0)
        self.tick.pack(fill="x", padx=8, pady=(0, 4))
        self.tick_text = self.tick.create_text(8, 13, anchor="w", fill=GOLD,
                                               font=("Segoe UI", 9, "bold"),
                                               text="Welcome to the clubhouse.")
        self.after(500, self._scroll_tick)
        cols = tk.Frame(self.inner, bg=BG)
        cols.pack(fill="both", expand=True, padx=8, pady=4)
        self.boxes = {}
        for title in ("Upcoming deadlines", "Open tasks", "Latest intel", "Recent finance"):
            f = tk.LabelFrame(cols, text=title, bg=PANEL, fg=FG, font=("Segoe UI", 10, "bold"))
            f.pack(side="left", fill="both", expand=True, padx=4)
            lb = tk.Listbox(f, bg=INK, fg=FG, relief="flat", font=("Segoe UI", 9), height=14)
            lb.pack(fill="both", expand=True, padx=6, pady=6)
            self.boxes[title] = lb

    def refresh(self):
        db = self.app.db
        members = [m for m in db.all("members") if m.get("status") == "Active"]
        prosp = [p for p in db.all("prospects") if p.get("stage") in ("Hangaround", "Prospect")]
        tasks = [t for t in db.all("tasks") if t.get("status") != "Done"]
        active = [p for p in db.all("projects") if p.get("status") == "Active"]
        bikes = db.all("bikes")
        ready = [b for b in bikes if b.get("status") == "Road Ready"]
        stats = [(len(members), "PATCHED", lambda v: str(int(v))),
                 (len(prosp), "PROSPECTS", lambda v: str(int(v))),
                 (len(tasks), "OPEN TASKS", lambda v: str(int(v))),
                 (db.balance(), "TREASURY", money),
                 (len(active), "ACTIVE PROJECTS", lambda v: str(int(v)))]
        for (n, l), (v, t, fmt) in zip(self.stat_lbls, stats):
            count_up(n, v, fmt)
            l.config(text=t)
        n6, l6 = self.stat_lbls[5]
        count_up(n6, len(ready), lambda v: "%d/%d" % (int(v), len(bikes)))
        l6.config(text="BIKES READY")
        for lb in self.boxes.values():
            lb.delete(0, "end")
        dl = [d for d in db.all("deadlines") if d.get("done") != "Yes" and d.get("date")]
        dl.sort(key=lambda r: r.get("date") or "9999")
        for d in dl[:10]:
            n = days_until(d.get("date"))
            tag = "OVERDUE %dd" % abs(n) if n is not None and n < 0 else ("TODAY" if n == 0 else ("in %dd" % n if n is not None else ""))
            self.boxes["Upcoming deadlines"].insert("end", "%s - %s (%s)" % (d.get("date"), d.get("title"), tag))
        for t in tasks[:12]:
            self.boxes["Open tasks"].insert("end", "[%s] %s (%s)" % (t.get("priority"), t.get("title"), t.get("assignedTo") or "unassigned"))
        intel = sorted(db.all("intel"), key=lambda r: r.get("date") or "", reverse=True)
        for i in intel[:12]:
            self.boxes["Latest intel"].insert("end", "[%s] %s" % (i.get("category"), i.get("subject")))
        fin = sorted(db.all("finance"), key=lambda r: r.get("date") or "", reverse=True)
        for f in fin[:12]:
            sign = "+" if f.get("type") == "in" else "-"
            self.boxes["Recent finance"].insert("end", "%s %s%s %s" % (f.get("date"), sign, money(f.get("amount")), f.get("category")))
        try:
            bits = ["%s %s" % (d.get("date"), d.get("title")) for d in dl[:5]]
            bits += ["%s" % i.get("subject") for i in intel[:5]]
            self.tick.itemconfig(self.tick_text, text="   •   ".join(bits) or "Ride safe.")
        except Exception:
            pass

    def _scroll_tick(self):
        try:
            if not _alive(self):
                return
            self.tick.move(self.tick_text, -2, 0)
            box = self.tick.bbox(self.tick_text)
            if box and box[2] < 0:
                self.tick.coords(self.tick_text, self.tick.winfo_width(), 13)
            self.after(30, self._scroll_tick)
        except Exception:
            pass


# ---------- settings ----------
class SettingsView(ScrollableFrame):
    def __init__(self, parent, app):
        ScrollableFrame.__init__(self, parent)
        self.app = app
        card = tk.Frame(self.inner, bg=PANEL, padx=16, pady=14)
        card.pack(fill="x", padx=8, pady=8)
        tk.Label(card, text="Club Settings", bg=PANEL, fg=FG, font=("Segoe UI", 12, "bold")).pack(anchor="w")
        self.vars = {}
        for key, label in (("club", "Club name"), ("pass", "Passcode"), ("church", "Church day")):
            tk.Label(card, text=label, bg=PANEL, fg=MUTED).pack(anchor="w", pady=(8, 0))
            v = tk.StringVar(value=app.db.get_setting(key))
            tk.Entry(card, textvariable=v, width=40, bg=INK, fg=FG, insertbackground=FG, relief="flat").pack(anchor="w", ipady=4)
            self.vars[key] = v
        self.sounds_var = tk.BooleanVar(value=app.db.get_setting("sounds", "1") == "1")
        tk.Checkbutton(card, text="Alarm + notification sounds", variable=self.sounds_var,
                       bg=PANEL, fg=FG, selectcolor=PANEL2,
                       activebackground=PANEL, activeforeground=FG).pack(anchor="w", pady=(10, 0))
        tk.Label(card, text="Warn me this many days before deadlines", bg=PANEL, fg=MUTED).pack(anchor="w", pady=(8, 0))
        self.notify_var = tk.StringVar(value=app.db.get_setting("notify_days", "3"))
        tk.Entry(card, textvariable=self.notify_var, width=8, bg=INK, fg=FG,
                 insertbackground=FG, relief="flat").pack(anchor="w", ipady=4)
        tk.Label(card, text="UI scale (applies instantly)", bg=PANEL, fg=MUTED).pack(anchor="w", pady=(8, 0))
        self.scale_var = tk.StringVar(value=app.db.get_setting("uiscale", "100"))
        sc = ttk.Combobox(card, textvariable=self.scale_var, values=["100", "125", "150"],
                          width=8, state="readonly")
        sc.pack(anchor="w")
        sc.bind("<<ComboboxSelected>>", lambda e: self.apply_scale())
        tk.Button(card, text="Save", bg=RED, fg="white", relief="flat", padx=16, command=self.save).pack(anchor="w", pady=10)
        dz = tk.Frame(self.inner, bg=PANEL, padx=16, pady=14)
        dz.pack(fill="x", padx=8, pady=4)
        tk.Label(dz, text="Data", bg=PANEL, fg=FG, font=("Segoe UI", 12, "bold")).pack(anchor="w")
        row = tk.Frame(dz, bg=PANEL)
        row.pack(anchor="w", pady=8)
        tk.Button(row, text="Export backup (JSON)", bg=PANEL2, fg=FG, relief="flat", padx=10, command=app.export_data).pack(side="left")
        tk.Button(row, text="Import backup", bg=PANEL2, fg=FG, relief="flat", padx=10, command=app.import_data).pack(side="left", padx=6)
        tk.Button(row, text="Reload demo data", bg=PANEL2, fg=FG, relief="flat", padx=10, command=self.reseed).pack(side="left", padx=6)
        tk.Button(row, text="WIPE ALL DATA", bg=PANEL2, fg="#e74c3c", relief="flat", padx=10, command=self.wipe).pack(side="left", padx=6)

        cz = tk.Frame(self.inner, bg=PANEL, padx=16, pady=14)
        cz.pack(fill="x", padx=8, pady=4)
        tk.Label(cz, text="Cities / Servers (gang dossiers)", bg=PANEL, fg=FG,
                 font=("Segoe UI", 12, "bold")).pack(anchor="w")
        tk.Label(cz, text="Tag dossiers per city. Add new ones as the club expands.",
                 bg=PANEL, fg=MUTED, font=("Segoe UI", 9)).pack(anchor="w")
        self.city_list = tk.Listbox(cz, bg=INK, fg=FG, relief="flat", height=4, width=40)
        self.city_list.pack(anchor="w", pady=6)
        crow = tk.Frame(cz, bg=PANEL)
        crow.pack(anchor="w")
        self.city_entry = tk.Entry(crow, width=24, bg=INK, fg=FG, insertbackground=FG, relief="flat")
        self.city_entry.pack(side="left", ipady=4)
        tk.Button(crow, text="Add city", bg=PANEL2, fg=FG, relief="flat", padx=10,
                  command=self.add_city).pack(side="left", padx=6)
        tk.Button(crow, text="Delete", bg=PANEL2, fg="#e74c3c", relief="flat", padx=10,
                  command=self.del_city).pack(side="left")
        self.refresh_cities()

    def refresh(self):
        for k, v in self.vars.items():
            v.set(self.app.db.get_setting(k))
        self.sounds_var.set(self.app.db.get_setting("sounds", "1") == "1")
        self.notify_var.set(self.app.db.get_setting("notify_days", "3"))
        self.scale_var.set(self.app.db.get_setting("uiscale", "100"))
        self.refresh_cities()

    def save(self):
        for k, v in self.vars.items():
            self.app.db.set_setting(k, v.get().strip() or self.app.db.get_setting(k))
        self.app.db.set_setting("sounds", "1" if self.sounds_var.get() else "0")
        self.app.db.set_setting("notify_days", self.notify_var.get().strip() or "3")
        self.app.db.set_setting("uiscale", self.scale_var.get().strip() or "100")
        self.apply_scale()
        messagebox.showinfo("Saved", "Settings saved.", parent=self)

    def apply_scale(self):
        try:
            pct = int(self.scale_var.get())
            self.app.db.set_setting("uiscale", str(pct))
            base = getattr(self.app, "_base_scaling", None) or self.app.tk.call("tk", "scaling")
            self.app._base_scaling = base
            self.app.tk.call("tk", "scaling", base * pct / 100)
        except Exception:
            pass

    def refresh_cities(self):
        try:
            self.city_list.delete(0, "end")
            for c in self.app.db.get_cities():
                self.city_list.insert("end", c["name"])
        except Exception:
            pass

    def add_city(self):
        name = self.city_entry.get().strip()
        if not name:
            return
        if self.app.db.add_city(name):
            self.city_entry.delete(0, "end")
            self.refresh_cities()
            self.app.toast("City added")
        else:
            messagebox.showinfo("Cities", "That city already exists.", parent=self)

    def del_city(self):
        sel = self.city_list.curselection()
        if not sel:
            messagebox.showinfo("Cities", "Select a city first.", parent=self)
            return
        name = self.city_list.get(sel[0])
        if messagebox.askyesno("Cities", "Delete '%s'? Dossiers keep the old name as text." % name, parent=self):
            cities = self.app.db.get_cities()
            match = next((c for c in cities if c["name"] == name), None)
            if match:
                self.app.db.del_city(match["id"])
                self.refresh_cities()

    def reseed(self):
        if messagebox.askyesno("Reseed", "Replace ALL data with demo seed?", parent=self):
            self.app.db.reseed()
            self.app.refresh_current()

    def wipe(self):
        if messagebox.askyesno("WIPE", "WIPE EVERYTHING? Export first!", parent=self):
            self.app.db.wipe()
            self.app.refresh_current()


# ---------- timer (with audible alarm) ----------
class TimerView(tk.Frame):
    def __init__(self, parent, app):
        super().__init__(parent, bg=BG)
        self.app = app
        self.remaining = 0
        self.running = False
        top = tk.Frame(self, bg=BG)
        top.pack(pady=(24, 4))
        self.display = tk.Label(top, text="00:00:00", bg=BG, fg=GOLD,
                                font=("Segoe UI", 64, "bold"))
        self.display.pack()
        self.tlabel = tk.Label(self, text="Set a countdown — church, meet, job window",
                               bg=BG, fg=MUTED, font=("Segoe UI", 11))
        self.tlabel.pack()
        row = tk.Frame(self, bg=BG)
        row.pack(pady=14)
        tk.Label(row, text="Minutes:", bg=BG, fg=MUTED).pack(side="left")
        self.mins = tk.Entry(row, width=8, bg=INK, fg=FG, insertbackground=FG,
                             relief="flat", justify="center", font=("Segoe UI", 12))
        self.mins.insert(0, "30")
        self.mins.pack(side="left", padx=6, ipady=4)
        tk.Label(row, text="Label:", bg=BG, fg=MUTED).pack(side="left", padx=(10, 0))
        self.name = tk.Entry(row, width=24, bg=INK, fg=FG, insertbackground=FG,
                             relief="flat", font=("Segoe UI", 11))
        self.name.insert(0, "Church")
        self.name.pack(side="left", padx=6, ipady=4)
        brow = tk.Frame(self, bg=BG)
        brow.pack(pady=6)
        tk.Button(brow, text="Start", bg=RED, fg="white", relief="flat", padx=20, pady=5,
                  font=("Segoe UI", 10, "bold"), command=self.start).pack(side="left", padx=5)
        tk.Button(brow, text="Pause", bg=PANEL2, fg=FG, relief="flat", padx=20, pady=5,
                  font=("Segoe UI", 10), command=self.pause).pack(side="left", padx=5)
        tk.Button(brow, text="Reset", bg=PANEL2, fg=FG, relief="flat", padx=20, pady=5,
                  font=("Segoe UI", 10), command=self.reset).pack(side="left", padx=5)
        prow = tk.Frame(self, bg=BG)
        prow.pack(pady=6)
        for m in (5, 15, 30, 60, 90):
            tk.Button(prow, text="%dm" % m, bg=PANEL2, fg=FG, relief="flat", padx=10,
                      command=lambda v=m: self.preset(v)).pack(side="left", padx=4)

    def preset(self, m):
        self.mins.delete(0, "end")
        self.mins.insert(0, str(m))

    @staticmethod
    def fmt(s):
        s = max(0, int(s))
        return "%02d:%02d:%02d" % (s // 3600, (s % 3600) // 60, s % 60)

    def start(self):
        try:
            secs = int(float(self.mins.get()) * 60)
        except ValueError:
            messagebox.showwarning("Timer", "Enter minutes as a number.", parent=self)
            return
        if secs <= 0:
            return
        if not self.running and self.remaining <= 0:
            self.remaining = secs
        self.display.config(fg=GOLD)
        self.tlabel.config(text=self.name.get().strip() or "Timer")
        self.running = True
        self._tick()

    def pause(self):
        self.running = False

    def reset(self):
        self.running = False
        self.remaining = 0
        stop_alarm()
        self.display.config(text="00:00:00", fg=GOLD)

    def _tick(self):
        if not self.running or not _alive(self):
            return
        self.display.config(text=self.fmt(self.remaining))
        if self.remaining <= 0:
            self.running = False
            self._ring()
            return
        self.remaining -= 1
        self.after(1000, self._tick)

    def _ring(self):
        self.display.config(fg=RED)
        start_alarm()
        pop = tk.Toplevel(self)
        pop.title("TIME!")
        pop.configure(bg=RED)
        pop.geometry("380x200")
        tk.Label(pop, text="TIME!", bg=RED, fg="white",
                 font=("Segoe UI", 30, "bold")).pack(pady=(20, 0))
        tk.Label(pop, text=self.tlabel.cget("text"), bg=RED, fg="white",
                 font=("Segoe UI", 12)).pack()
        tk.Button(pop, text="STOP ALARM", bg="white", fg=RED, relief="flat", padx=22, pady=6,
                  font=("Segoe UI", 11, "bold"),
                  command=lambda: (stop_alarm(), pop.destroy())).pack(pady=14)
        try:
            pop.attributes("-topmost", True)
            pop.after(600, lambda: pop.attributes("-topmost", False) if _alive(pop) else None)
        except Exception:
            pass

    def refresh(self):
        pass


# ---------- main app ----------
class MCApp(tk.Tk):
    def __init__(self, db):
        super().__init__()
        self.db = db
        ACTIVE["db"] = db
        self.title("Rebel Hounds MC - Club Manager")
        self.geometry("1360x820")
        self.minsize(1080, 640)
        self.configure(bg=BG)
        self._base_scaling = self.tk.call("tk", "scaling")
        try:
            pct = int(db.get_setting("uiscale", "100") or 100)
            if pct != 100:
                self.tk.call("tk", "scaling", self._base_scaling * pct / 100)
        except Exception:
            pass
        try:
            self.state("zoomed")
        except tk.TclError:
            pass
        style = ttk.Style(self)
        try:
            style.theme_use("clam")
        except tk.TclError:
            pass
        style.configure("Treeview", background=INK, foreground=FG, fieldbackground=INK,
                        rowheight=28, font=("Segoe UI", 9), borderwidth=0)
        style.map("Treeview", background=[("selected", RED_DARK)],
                  foreground=[("selected", "white")])
        style.configure("Treeview.Heading", background=PANEL2, foreground=FG, font=("Segoe UI", 9, "bold"))
        style.configure("TCombobox", fieldbackground=INK, background=PANEL2, foreground=FG)
        style.configure("TScrollbar", background=PANEL2)

        side = tk.Frame(self, bg=PANEL, width=200)
        side.pack(side="left", fill="y")
        side.pack_propagate(False)
        tk.Label(side, text="REBEL HOUNDS", bg=PANEL, fg=FG, font=("Segoe UI", 13, "bold")).pack(pady=(14, 0))
        tk.Label(side, text="MC MANAGER", bg=PANEL, fg=RED, font=("Segoe UI", 9, "bold")).pack(pady=(0, 10))
        self.nav_btns = {}
        for gname, keys in NAV_GROUPS:
            tk.Label(side, text=gname, bg=PANEL, fg=GOLD_DIM,
                     font=("Segoe UI", 8, "bold"), anchor="w", padx=16).pack(fill="x", pady=(10, 2))
            for key in keys:
                label = NAV_TITLES[key]
                b = tk.Button(side, text=label, bg=PANEL, fg=FG, relief="flat", anchor="w", padx=16,
                              font=("Segoe UI", 10), activebackground=PANEL2, activeforeground=FG,
                              command=lambda k=key: self.show(k))
                b.pack(fill="x", pady=1)
                b._navkey = key
                b.bind("<Enter>", lambda e, x=b: x.config(bg="#33333b") if x._navkey != self.current else None)
                b.bind("<Leave>", lambda e, x=b: x.config(bg=RED_DARK if x._navkey == self.current else PANEL))
                self.nav_btns[key] = b
        self.ind = tk.Frame(side, bg=RED, width=4)
        self.ind.place(x=0, y=86, height=30)
        self._urgent = False
        self._blink_on = False
        self._blink()
        tk.Frame(side, bg=PANEL).pack(expand=True, fill="both")
        tk.Button(side, text="Export", bg=PANEL2, fg=FG, relief="flat", command=self.export_data).pack(fill="x", padx=10, pady=2)
        tk.Button(side, text="Import", bg=PANEL2, fg=FG, relief="flat", command=self.import_data).pack(fill="x", padx=10, pady=2)
        tk.Button(side, text="Lock", bg=PANEL2, fg=FG, relief="flat", command=self.lock).pack(fill="x", padx=10, pady=(2, 12))

        right = tk.Frame(self, bg=BG)
        right.pack(side="left", fill="both", expand=True)
        top = tk.Frame(right, bg=BG)
        top.pack(fill="x", padx=10, pady=8)
        self.title_lbl = tk.Label(top, text="Dashboard", bg=BG, fg=FG, font=("Segoe UI", 16, "bold"))
        self.title_lbl.pack(side="left")
        self.clock = tk.Label(top, text="", bg=BG, fg=MUTED)
        self.clock.pack(side="right")
        self._tick()

        self.container = tk.Frame(right, bg=BG)
        self.container.pack(fill="both", expand=True)
        self.status = tk.Label(right, text="", bg=PANEL, fg=MUTED, anchor="w",
                               font=("Segoe UI", 8), padx=10, pady=4)
        self.status.pack(side="bottom", fill="x")
        self.views = {"dashboard": Dashboard(self.container, self),
                      "settings": SettingsView(self.container, self),
                      "timer": TimerView(self.container, self)}
        for key, _label in NAV:
            if key in ("dashboard", "settings", "timer"):
                continue
            self.views[key] = ListView(self.container, self, key)
        for v in self.views.values():
            v.place(relx=0, rely=0, relwidth=1, relheight=1)
        self.current = "dashboard"
        self.show("dashboard")
        try:
            self.attributes("-alpha", 0.0)
            fade(self, 0.0, 1.0, 300)
        except Exception:
            pass
        self._notified = set()
        self.after(8000, self._watch)

    def _tick(self):
        self.clock.config(text=datetime.datetime.now().strftime("%a %d %b %Y  %H:%M:%S"))
        self.after(1000, self._tick)

    def show(self, key):
        self.current = key
        self.views[key].tkraise()
        self.title_lbl.config(text=NAV_TITLES[key])
        for k, b in self.nav_btns.items():
            b.config(bg=RED_DARK if k == key else PANEL)
        try:
            self.update_idletasks()
            btn = self.nav_btns[key]
            slide_indicator(self.ind, btn.winfo_y() + max(0, (btn.winfo_height() - 30) // 2))
        except Exception:
            pass
        self.refresh_current()

    def refresh_current(self):
        self.views[self.current].refresh()
        self._update_status()
        try:
            urg = sum(1 for d in self.db.all("deadlines")
                      if d.get("done") != "Yes" and (days_until(d.get("date")) or 99) < 0)
            urg += sum(1 for t in self.db.all("tasks")
                       if t.get("status") != "Done" and (days_until(t.get("due")) or 99) < 0)
            self._urgent = urg > 0
            b = self.nav_btns.get("deadlines")
            if b:
                b.config(text="Deadlines (%d)" % urg if urg else "Deadlines")
        except Exception:
            pass

    def _blink(self):
        """Pulse the Deadlines button while anything is overdue."""
        try:
            if _alive(self):
                b = self.nav_btns.get("deadlines")
                if b:
                    if self._urgent:
                        self._blink_on = not self._blink_on
                        b.config(fg="#ff6b5e" if self._blink_on else FG)
                    else:
                        b.config(fg=FG)
                self.after(600, self._blink)
        except Exception:
            pass

    def toast(self, msg):
        """Slide-in notification popup, bottom right."""
        try:
            t = tk.Toplevel(self)
            t.overrideredirect(True)
            t.configure(bg=GREEN)
            tk.Label(t, text=msg, bg=GREEN, fg="white",
                     font=("Segoe UI", 10, "bold"), padx=16, pady=8).pack()
            t.update_idletasks()
            x = self.winfo_x() + self.winfo_width() - t.winfo_width() - 24
            y = self.winfo_y() + self.winfo_height() - t.winfo_height() - 60
            t.geometry("+%d+%d" % (x, y))
            t.attributes("-alpha", 0.0)
            fade(t, 0.0, 1.0, 180)
            self.after(1600, lambda: fade(t, 1.0, 0.0, 250, t.destroy))
        except Exception:
            pass

    def _update_status(self):
        try:
            nm = len(self.db.all("members"))
            over = sum(1 for d in self.db.all("deadlines")
                       if d.get("done") != "Yes" and (days_until(d.get("date")) or 99) < 0)
            self.status.config(text="Members: %d    Overdue: %d    Treasury: %s    %s" %
                                    (nm, over, money(self.db.balance()),
                                     os.path.basename(self.db.path)))
        except Exception:
            pass

    def _watch(self):
        """Background deadline monitor: alerts for nearing, due, and past items."""
        try:
            if not _alive(self):
                return
            try:
                soon_n = int(self.db.get_setting("notify_days", "3") or 3)
            except ValueError:
                soon_n = 3
            overdue, today, soon = [], [], []

            def bucketize(table, rid, title, stamp, done):
                n = days_until(stamp)
                if n is None or done:
                    return
                key = (table, rid, "over" if n < 0 else ("today" if n == 0 else "soon"))
                if key in self._notified:
                    return
                if n < 0:
                    self._notified.add(key)
                    overdue.append(title)
                elif n == 0:
                    self._notified.add(key)
                    today.append(title)
                elif n <= soon_n:
                    self._notified.add(key)
                    soon.append("%s (in %dd)" % (title, n))

            for d in self.db.all("deadlines"):
                if d.get("date"):
                    bucketize("deadlines", d["id"], "%s — %s" % (d.get("title"), d.get("date")),
                              d.get("date"), d.get("done") == "Yes")
            for t in self.db.all("tasks"):
                if t.get("due"):
                    bucketize("tasks", t["id"], "%s (due %s)" % (t.get("title"), t.get("due")),
                              t.get("due"), t.get("status") == "Done")
            if overdue or today or soon:
                self._alert_popup(overdue, today, soon)
                play_urgent() if overdue else play_chime()
            self.after(120000, self._watch)
        except Exception:
            pass

    def _alert_popup(self, overdue, today, soon):
        try:
            pop = tk.Toplevel(self)
            pop.title("Club Alerts")
            pop.configure(bg=BG)
            pop.geometry("480x400")
            tk.Label(pop, text="CLUB ALERTS", bg=BG, fg=GOLD,
                     font=("Segoe UI", 13, "bold")).pack(pady=(12, 4))
            box = tk.Text(pop, bg=INK, fg=FG, relief="flat",
                          font=("Segoe UI", 10), height=15, width=54)
            box.pack(padx=12, pady=6, fill="both", expand=True)
            if overdue:
                box.insert("end", "PAST DUE\n")
                for it in overdue:
                    box.insert("end", "   ! " + it + "\n")
                box.insert("end", "\n")
            if today:
                box.insert("end", "DUE TODAY\n")
                for it in today:
                    box.insert("end", "   > " + it + "\n")
                box.insert("end", "\n")
            if soon:
                box.insert("end", "COMING UP\n")
                for it in soon:
                    box.insert("end", "   - " + it + "\n")
            box.config(state="disabled")
            row = tk.Frame(pop, bg=BG)
            row.pack(pady=8)
            tk.Button(row, text="Open Deadlines", bg=RED, fg="white", relief="flat", padx=14,
                      command=lambda: (pop.destroy(), self.show("deadlines"))).pack(side="left", padx=5)
            tk.Button(row, text="Dismiss", bg=PANEL2, fg=FG, relief="flat", padx=14,
                      command=pop.destroy).pack(side="left", padx=5)
        except Exception:
            pass

    def export_data(self):
        p = filedialog.asksaveasfilename(defaultextension=".json", filetypes=[("JSON", "*.json")],
                                         initialfile="rhmc-backup-%s.json" % datetime.date.today().isoformat())
        if p:
            self.db.export_json(p)
            messagebox.showinfo("Export", "Backup saved.", parent=self)

    def import_data(self):
        p = filedialog.askopenfilename(filetypes=[("JSON", "*.json")])
        if p:
            try:
                self.db.import_json(p)
                self.refresh_current()
                messagebox.showinfo("Import", "Backup loaded.", parent=self)
            except Exception as ex:
                messagebox.showerror("Import", "Bad file: %s" % ex, parent=self)

    def lock(self):
        self.destroy()
        main(login_first=True)


def login(root_db):
    win = tk.Toplevel()
    win.title("Rebel Hounds MC - Members Only")
    win.configure(bg=BG)
    win.geometry("340x220")
    win.resizable(False, False)
    win.grab_set()
    tk.Label(win, text="REBEL HOUNDS MC", bg=BG, fg=FG, font=("Segoe UI", 15, "bold")).pack(pady=(22, 0))
    tk.Label(win, text="CLUB MANAGER - MEMBERS ONLY", bg=BG, fg=RED, font=("Segoe UI", 9, "bold")).pack()
    pw = tk.Entry(win, show="*", width=28, bg=INK, fg=FG, insertbackground=FG,
                  relief="flat", justify="center", font=("Segoe UI", 12))
    pw.pack(pady=14, ipady=6)
    msg = tk.Label(win, text="Default passcode: hounds", bg=BG, fg=MUTED, font=("Segoe UI", 8))
    msg.pack()

    ok = {"v": False}

    def go(_e=None):
        if pw.get() == root_db.get_setting("pass", "hounds"):
            ok["v"] = True
            fade(win, 1.0, 0.0, 180, win.destroy)
        else:
            msg.config(text="Wrong passcode.", fg="#e74c3c")
            shake(win)
    tk.Button(win, text="Enter Clubhouse", bg=RED, fg="white", relief="flat", padx=20, pady=4,
              font=("Segoe UI", 10, "bold"), command=go).pack(pady=6)
    pw.bind("<Return>", go)
    pw.focus()
    win.transient()
    win.wait_window(win)
    return ok["v"]


def splash(parent):
    """Animated startup splash with rolling progress bar."""
    sp = tk.Toplevel(parent)
    sp.overrideredirect(True)
    sp.configure(bg=INK)
    w, h = 440, 220
    sp.geometry("%dx%d+%d+%d" % (w, h, (sp.winfo_screenwidth() - w) // 2,
                                 (sp.winfo_screenheight() - h) // 2))
    tk.Label(sp, text="REBEL HOUNDS MC", bg=INK, fg=FG,
             font=("Segoe UI", 22, "bold")).pack(pady=(36, 0))
    tk.Label(sp, text="CLUB MANAGER", bg=INK, fg=RED,
             font=("Segoe UI", 11, "bold")).pack()
    bar = ttk.Progressbar(sp, mode="indeterminate", length=300)
    bar.pack(pady=20)
    bar.start(10)
    msgs = ["Rolling out the bikes...", "Sweeping the clubhouse...",
            "Counting the treasury...", "Checking the turf..."]
    st = tk.Label(sp, text=msgs[0], bg=INK, fg=MUTED, font=("Segoe UI", 9))
    st.pack()

    def cycle(i=1):
        if _alive(sp) and i < len(msgs):
            st.config(text=msgs[i])
            sp.after(350, cycle, i + 1)
    sp.after(350, cycle)
    try:
        sp.attributes("-alpha", 0.0)
        fade(sp, 0.0, 1.0, 250)
    except Exception:
        pass
    return sp


def main(login_first=True):
    db = ClubDB(os.path.join(base_dir(), "club_data.db"))
    hide = tk.Tk()
    hide.withdraw()
    try:
        sp = splash(hide)
        sp.after(1500, lambda: fade(sp, 1.0, 0.0, 250, sp.destroy))
        hide.wait_window(sp)
        if login_first and not login(db):
            hide.destroy()
            return
        app = MCApp(db)
        hide.destroy()
        app.mainloop()
    except Exception:
        try:
            hide.destroy()
        except tk.TclError:
            pass
        raise


if __name__ == "__main__":
    main()
