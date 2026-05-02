"""
Sudoku Race - Player Stats Analysis
Play modes:
  - oftheday:  sudokuId starts with "oftheday-"
  - book:      sudokuBookPuzzleId starts with "ofthemonth-"
  - scan:      scannedAt is present and not "undefined"
  - other:     no metadata
"""

import json
import base64
import io
from datetime import datetime, timezone
from collections import defaultdict
import os

import polars as pl
from tabulate import tabulate
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import numpy as np

CHARTS_DIR = "exports/charts"
REPORT_PATH = "exports/sudoku-race-report.html"
os.makedirs(CHARTS_DIR, exist_ok=True)

# ---------------------------------------------------------------------------
# HTML report builder
# ---------------------------------------------------------------------------

_html_sections: list[str] = []

def _h(level: int, text: str) -> str:
    return f"<h{level}>{text}</h{level}>\n"

def html_section(title: str, level: int = 2):
    _html_sections.append(_h(level, title))

def html_p(text: str):
    _html_sections.append(f"<p>{text}</p>\n")

def html_table(rows, headers):
    """Render a list-of-lists as an HTML table."""
    def cell(v, tag="td"):
        return f"<{tag}>{v}</{tag}>"
    head = "<thead><tr>" + "".join(cell(h, "th") for h in headers) + "</tr></thead>\n"
    body = "<tbody>\n"
    for row in rows:
        body += "<tr>" + "".join(cell(v) for v in row) + "</tr>\n"
    body += "</tbody>\n"
    _html_sections.append(f"<div class='table-wrap'><table>\n{head}{body}</table></div>\n")

def html_fig(fig, caption: str = ""):
    """Embed a matplotlib figure as a base64 PNG."""
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight", dpi=150)
    buf.seek(0)
    b64 = base64.b64encode(buf.read()).decode()
    cap = f"<figcaption>{caption}</figcaption>" if caption else ""
    _html_sections.append(
        f"<figure><img src='data:image/png;base64,{b64}' alt='{caption}'>{cap}</figure>\n"
    )

def write_report():
    css = """
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
             max-width: 1200px; margin: 40px auto; padding: 0 24px;
             background: #f8f9fa; color: #212529; }
      h1   { border-bottom: 3px solid #4C72B0; padding-bottom: 8px; }
      h2   { margin-top: 48px; color: #4C72B0; border-bottom: 1px solid #dee2e6;
             padding-bottom: 4px; }
      h3   { margin-top: 32px; color: #495057; }
      h4   { margin-top: 20px; color: #6c757d; }
      table { border-collapse: collapse; width: 100%; font-size: 0.88rem;
              background: #fff; border-radius: 6px; overflow: hidden;
              box-shadow: 0 1px 4px rgba(0,0,0,.08); }
      th   { background: #4C72B0; color: #fff; padding: 8px 12px; text-align: left; }
      td   { padding: 6px 12px; border-bottom: 1px solid #dee2e6; }
      tr:last-child td { border-bottom: none; }
      tr:nth-child(even) td { background: #f1f3f5; }
      .table-wrap { overflow-x: auto; margin: 12px 0 24px; }
      figure { margin: 24px 0; text-align: center; }
      figure img { max-width: 100%; border-radius: 6px;
                   box-shadow: 0 2px 8px rgba(0,0,0,.12); }
      figcaption { margin-top: 8px; font-size: 0.85rem; color: #6c757d; }
      p    { color: #495057; }
      .stat-grid { display: flex; flex-wrap: wrap; gap: 16px; margin: 16px 0 24px; }
      .stat-card { background: #fff; border-radius: 8px; padding: 16px 20px;
                   box-shadow: 0 1px 4px rgba(0,0,0,.08); min-width: 160px; }
      .stat-card .val { font-size: 2rem; font-weight: 700; color: #4C72B0; }
      .stat-card .lbl { font-size: 0.8rem; color: #6c757d; margin-top: 2px; }
    </style>
    """
    generated = datetime.now().strftime("%Y-%m-%d %H:%M")
    header = f"""<!DOCTYPE html>
<html lang='en'>
<head>
  <meta charset='utf-8'>
  <meta name='viewport' content='width=device-width, initial-scale=1'>
  <title>Sudoku Race — Player Stats Report</title>
  {css}
</head>
<body>
<h1>Sudoku Race — Player Stats Report</h1>
<p style='color:#6c757d'>Generated {generated}</p>
"""
    footer = "</body></html>\n"
    with open(REPORT_PATH, "w") as f:
        f.write(header + "".join(_html_sections) + footer)
    print(f"  Report: {REPORT_PATH}")

PAID_COLOR  = "#4C72B0"
FREE_COLOR  = "#DD8452"
MODE_COLORS = {
    "oftheday": "#55A868",
    "book":     "#C44E52",
    "scan":     "#8172B2",
    "other":    "#CCB974",
}
COMP_COLOR  = "#55A868"
ABAND_COLOR = "#C44E52"

# ---------------------------------------------------------------------------
# 1. Parse records
# ---------------------------------------------------------------------------

DIFF_SORT = {
    "simple": 1, "easy": 2,
    "1-very-easy": 3, "2-easy": 4, "3-moderately-easy": 5,
    "intermediate": 6, "4-moderate": 7, "5-moderately-hard": 8,
    "6-hard": 9, "7-vicious": 10, "8-fiendish": 11,
    "9-devilish": 12, "10-hell": 13, "11-beyond-hell": 14,
}

DIFF_LABEL = {
    "simple": "Simple", "easy": "Easy",
    "1-very-easy": "1-Very Easy", "2-easy": "2-Easy",
    "3-moderately-easy": "3-Mod Easy", "intermediate": "Intermediate",
    "4-moderate": "4-Moderate", "5-moderately-hard": "5-Mod Hard",
    "6-hard": "6-Hard", "7-vicious": "7-Vicious", "8-fiendish": "8-Fiendish",
    "9-devilish": "9-Devilish", "10-hell": "10-Hell", "11-beyond-hell": "11-Beyond Hell",
}

def calculate_seconds(timer: dict) -> int:
    """Mirrors the TypeScript calculateSeconds: seconds + (lastInteraction - start)."""
    if not timer:
        return 0
    base = int(timer.get("seconds", {}).get("N", 0))
    in_prog = timer.get("inProgress", {}).get("M", {})
    start_str = in_prog.get("start", {}).get("S", "")
    last_str = in_prog.get("lastInteraction", {}).get("S", "")
    if start_str and last_str:
        try:
            start_dt = datetime.fromisoformat(start_str.replace("Z", "+00:00"))
            last_dt = datetime.fromisoformat(last_str.replace("Z", "+00:00"))
            elapsed = max(0, int((last_dt - start_dt).total_seconds()))
            return base + elapsed
        except Exception:
            pass
    return base


rows = []
party_records: dict[str, dict] = {}   # party model_id -> {name, created_at}
member_records: list[dict] = []       # raw member rows

with open("exports/sudoku-race-data.json") as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        record = json.loads(line)
        item = record.get("Item", {})
        model_id = item.get("modelId", {}).get("S", "")

        if model_id.startswith("party-"):
            payload = item.get("payload", {}).get("M", {})
            party_records[model_id] = {
                "party_name": payload.get("partyName", {}).get("S", ""),
                "created_at": int(item.get("createdAt", {}).get("N", 0)),
            }
            continue

        if model_id.startswith("member-"):
            payload = item.get("payload", {}).get("M", {})
            member_records.append({
                "user_id": payload.get("userId", {}).get("S", ""),
                "nickname": payload.get("memberNickname", {}).get("S", ""),
                "party_id": payload.get("resourceId", {}).get("S", ""),
                "created_at": int(item.get("createdAt", {}).get("N", 0)),
            })
            continue

        if not model_id.startswith("session-"):
            continue

        payload = item.get("payload", {}).get("M", {})
        state = payload.get("state", {}).get("M", {})
        metadata = state.get("metadata", {}).get("M", {})
        timer = state.get("timer", {}).get("M", {})

        session_id = payload.get("sessionId", {}).get("S", model_id)
        user_id = payload.get("userId", {}).get("S", "")
        puzzle_id = metadata.get("sudokuBookPuzzleId", {}).get("S", "")
        sudoku_id = metadata.get("sudokuId", {}).get("S", "")
        scanned_at = metadata.get("scannedAt", {}).get("S", None)
        difficulty_raw = metadata.get("difficulty", {}).get("S", "")
        created_at = int(item.get("createdAt", {}).get("N", 0))
        updated_at = int(item.get("updatedAt", {}).get("N", 0))

        # Classify mode
        is_scanned = scanned_at is not None and scanned_at != "undefined"
        if is_scanned:
            mode = "scan"
        elif sudoku_id.startswith("oftheday-"):
            mode = "oftheday"
        elif puzzle_id.startswith("ofthemonth-"):
            mode = "book"
        elif not metadata:
            mode = "other"
        else:
            mode = "other"

        total_seconds = calculate_seconds(timer)

        # completed = state.completed.at exists
        completed_obj = state.get("completed", {}).get("M", {})
        completed_at_str = completed_obj.get("at", {}).get("S", "")
        is_completed = bool(completed_at_str)

        # Canonical puzzle identifier (session_id is per-puzzle, shared across players)
        puzzle_key = session_id

        # Derive wall-clock start time: prefer inProgress.start (actual play time),
        # fall back to record createdAt (DynamoDB timestamp).
        in_prog = timer.get("inProgress", {}).get("M", {}) if timer else {}
        start_str = in_prog.get("start", {}).get("S", "") if in_prog else ""
        play_hour: int | None = None
        play_dow: int | None = None   # 0 = Monday … 6 = Sunday
        if start_str:
            try:
                start_dt = datetime.fromisoformat(start_str.replace("Z", "+00:00"))
                play_hour = start_dt.hour
                play_dow = start_dt.weekday()
            except Exception:
                pass
        if play_hour is None and created_at:
            dt = datetime.fromtimestamp(created_at, tz=timezone.utc)
            play_hour = dt.hour
            play_dow = dt.weekday()

        rows.append({
            "session_id": session_id,
            "puzzle_key": puzzle_key,
            "user_id": user_id,
            "mode": mode,
            "difficulty": difficulty_raw,
            "diff_label": DIFF_LABEL.get(difficulty_raw, difficulty_raw or "Unknown"),
            "diff_sort": DIFF_SORT.get(difficulty_raw, 99),
            "total_seconds": total_seconds,
            "is_completed": is_completed,
            "created_at": created_at,
            "updated_at": updated_at,
            "play_hour": play_hour,
            "play_dow": play_dow,
        })

df = pl.DataFrame(rows)

# Add date columns
df = df.with_columns([
    pl.from_epoch("created_at", time_unit="s").alias("created_dt"),
]).with_columns([
    pl.col("created_dt").dt.date().alias("date"),
    pl.col("created_dt").dt.year().alias("year"),
    pl.col("created_dt").dt.month().alias("month"),
    pl.col("created_dt").dt.iso_year().alias("iso_year"),
    pl.col("created_dt").dt.week().alias("iso_week"),
]).with_columns([
    (pl.col("iso_year").cast(pl.Utf8) + "-W" +
     pl.col("iso_week").cast(pl.Utf8).str.zfill(2)).alias("year_week"),
    (pl.col("year").cast(pl.Utf8) + "-" +
     pl.col("month").cast(pl.Utf8).str.zfill(2)).alias("year_month"),
])

MODE_LABELS = {
    "oftheday": "Sudoku of the Day",
    "book":     "Sudoku Book",
    "scan":     "Scan to Import",
    "other":    "Other",
}

# ---------------------------------------------------------------------------
# Party membership structures
# party_member_count: party_id -> number of members
# user_parties: user_id -> set of party_ids they belong to
# multi_member_parties: party_ids with 2+ members (genuine group play)
# party_users: user_ids who are in at least one multi-member party
# ---------------------------------------------------------------------------

from collections import Counter as _Counter
party_member_count = _Counter(m["party_id"] for m in member_records)
multi_member_parties = {pid for pid, cnt in party_member_count.items() if cnt >= 2}

user_parties: dict[str, set] = {}
for m in member_records:
    user_parties.setdefault(m["user_id"], set()).add(m["party_id"])

party_users = {uid for uid, pids in user_parties.items() if pids & multi_member_parties}
multi_party_users = {uid for uid, pids in user_parties.items()
                     if len(pids & multi_member_parties) >= 2}

# n_multi_member_parties per user (for the per-user list)
user_multi_party_count = {uid: len(pids & multi_member_parties)
                          for uid, pids in user_parties.items()}

df = df.with_columns([
    pl.col("user_id").is_in(list(party_users)).alias("in_party"),
    pl.col("user_id").is_in(list(multi_party_users)).alias("in_multi_party"),
])

# ---------------------------------------------------------------------------
# Infer paid users: anyone who COMPLETED 2+ distinct puzzles on the same
# calendar day at any point is assumed to have a paid subscription.
# ---------------------------------------------------------------------------

completed_per_user_day = (
    pl.DataFrame(rows)
    .filter(pl.col("is_completed"))
    .with_columns(
        pl.from_epoch("created_at", time_unit="s").dt.date().alias("date")
    )
    .group_by(["user_id", "date"])
    .agg(pl.col("puzzle_key").n_unique().alias("puzzles"))
)

paid_users = set(
    completed_per_user_day
    .filter(pl.col("puzzles") >= 2)
    ["user_id"]
    .unique()
    .to_list()
)

df = df.with_columns(
    pl.col("user_id").is_in(list(paid_users)).alias("is_paid")
)

TIER_LABELS = {True: "Paid", False: "Free"}

# Build user_id -> nickname map from member records
user_nicknames: dict[str, str] = {}
with open("exports/sudoku-race-data.json") as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        record = json.loads(line)
        item = record.get("Item", {})
        model_id = item.get("modelId", {}).get("S", "")
        if not model_id.startswith("member-"):
            continue
        payload = item.get("payload", {}).get("M", {})
        uid = payload.get("userId", {}).get("S", "")
        nickname = payload.get("memberNickname", {}).get("S", "")
        if uid and nickname and uid not in user_nicknames:
            user_nicknames[uid] = nickname

print("=" * 72)
print("SUDOKU RACE — PLAYER STATS ANALYSIS")
print("=" * 72)

# ---------------------------------------------------------------------------
# 0. Paid vs Free user split
# ---------------------------------------------------------------------------

def pt(rows, headers, subtitle=""):
    """Print table to stdout and add to HTML report."""
    print(tabulate(rows, headers=headers, tablefmt="github"))
    if subtitle:
        _html_sections.append(f"<h4>{subtitle}</h4>\n")
    html_table(rows, headers)

def hs(title, level=2):
    """Print section heading to stdout and HTML."""
    marker = "#" * level
    print(f"\n\n{marker} {title}\n")
    html_section(title, level)

def hp(text):
    print(f"  {text}")
    html_p(text)

print("\n\n### 0. PAID vs FREE USER INFERENCE\n")
html_section("0. Paid vs Free User Inference")
free_users = set(df["user_id"].unique().to_list()) - paid_users
hp(f"Paid users (completed 2+ puzzles in one day at any point): {len(paid_users)}")
hp(f"Free users: {len(free_users)}")
hp(f"Total unique users: {df['user_id'].n_unique()}")
print()

# Per-user session counts and max completed puzzles in a day for context
user_sessions = df.group_by("user_id").agg(pl.len().alias("sessions"))
max_day = (
    completed_per_user_day
    .group_by("user_id")
    .agg(pl.col("puzzles").max().alias("max_puzzles_in_day"))
)

paid_table = []
for uid in sorted(paid_users, key=lambda u: user_nicknames.get(u, u).lower()):
    nickname = user_nicknames.get(uid, "—")
    sessions = user_sessions.filter(pl.col("user_id") == uid)["sessions"][0] if len(user_sessions.filter(pl.col("user_id") == uid)) else 0
    mx = max_day.filter(pl.col("user_id") == uid)["max_puzzles_in_day"][0] if len(max_day.filter(pl.col("user_id") == uid)) else 0
    n_parties = user_multi_party_count.get(uid, 0)
    paid_table.append([nickname, uid, sessions, mx, n_parties])
pt(paid_table, ["Nickname", "User ID", "Total Sessions", "Max Completed/Day", "Parties"], "Paid Users")

free_table = []
for uid in sorted(free_users, key=lambda u: user_nicknames.get(u, u).lower()):
    nickname = user_nicknames.get(uid, "—")
    sessions = user_sessions.filter(pl.col("user_id") == uid)["sessions"][0] if len(user_sessions.filter(pl.col("user_id") == uid)) else 0
    n_parties = user_multi_party_count.get(uid, 0)
    free_table.append([nickname, uid, sessions, n_parties])
pt(free_table, ["Nickname", "User ID", "Total Sessions", "Parties"], "Free Users")
print()

def user_counts(sub):
    paid = sub.filter(pl.col("is_paid"))["user_id"].n_unique()
    free = sub.filter(~pl.col("is_paid"))["user_id"].n_unique()
    return paid, free

overall_timed = df.filter(pl.col("total_seconds") > 60)
overall_med = overall_timed["total_seconds"].median() / 60 if len(overall_timed) else None
overall_per_ud = df.group_by(["user_id", "date"]).agg(pl.col("puzzle_key").n_unique().alias("puzzles"))
n_completed = df["is_completed"].sum()
n_abandoned = len(df) - n_completed
pt([[
        df["user_id"].n_unique(), len(paid_users), len(free_users),
        len(df), n_completed, n_abandoned,
        f"{overall_per_ud['puzzles'].mean():.2f}",
        f"{overall_med:.1f} min" if overall_med else "—",
    ]],
    ["Total Users", "Paid Users", "Free Users", "Total Records", "Completed", "Abandoned", "Avg Puzzles/User/Day", "Median Session Time"],
)

# ---------------------------------------------------------------------------
# 2. Overview by mode
# ---------------------------------------------------------------------------

hs("1. Overview by Play Mode")

overview_rows = []
for mode, label in MODE_LABELS.items():
    sub = df.filter(pl.col("mode") == mode)
    n_records = len(sub)
    n_paid, n_free = user_counts(sub)
    n_puzzles = sub["puzzle_key"].n_unique()
    n_comp = sub["is_completed"].sum()
    n_aband = n_records - n_comp
    timed = sub.filter(pl.col("total_seconds") > 60)
    med_min = timed["total_seconds"].median() / 60 if len(timed) else None
    overview_rows.append([
        label, n_records, n_paid, n_free, n_puzzles,
        n_comp, n_aband,
        f"{med_min:.1f} min" if med_min else "—",
    ])

pt(overview_rows, ["Mode", "Records", "Paid Users", "Free Users", "Unique Puzzles", "Completed", "Abandoned", "Median Session Time"])

# ---------------------------------------------------------------------------
# 3. Per-mode × difficulty breakdown
# ---------------------------------------------------------------------------

hs("2. Breakdown by Mode & Difficulty")

for mode, label in MODE_LABELS.items():
    sub = df.filter(pl.col("mode") == mode)
    if len(sub) == 0:
        continue

    print(f"\n--- {label} ---\n")
    html_section(label, level=3)

    diffs = (
        sub.group_by(["diff_label", "diff_sort"])
        .agg([
            pl.len().alias("records"),
            pl.col("user_id").filter(pl.col("is_paid")).n_unique().alias("paid_users"),
            pl.col("user_id").filter(~pl.col("is_paid")).n_unique().alias("free_users"),
            pl.col("puzzle_key").n_unique().alias("unique_puzzles"),
            pl.col("is_completed").sum().alias("completed"),
            pl.col("total_seconds").filter(pl.col("is_completed") & (pl.col("total_seconds") > 60)).median().alias("median_completed_seconds"),
            pl.col("total_seconds").filter(pl.col("is_completed") & (pl.col("total_seconds") > 60)).min().alias("min_completed_seconds"),
            pl.col("total_seconds").filter(pl.col("is_completed") & (pl.col("total_seconds") > 60)).max().alias("max_completed_seconds"),
        ])
        .sort("diff_sort")
    )

    def fmt(s):
        if s is None:
            return "—"
        s = int(s)
        return f"{s//60}m {s%60}s"

    table = []
    for row in diffs.iter_rows(named=True):
        abandoned = row["records"] - row["completed"]
        table.append([
            row["diff_label"],
            row["records"],
            row["paid_users"],
            row["free_users"],
            row["completed"], abandoned,
            fmt(row["min_completed_seconds"]),
            fmt(row["median_completed_seconds"]),
            fmt(row["max_completed_seconds"]),
        ])

    pt(table, ["Difficulty", "Records", "Paid Users", "Free Users", "Completed", "Abandoned", "Fastest", "Median", "Slowest"])

# ---------------------------------------------------------------------------
# 4. Puzzles per user per day
# ---------------------------------------------------------------------------

def per_period_stats(sub, group_cols):
    """Return (avg, median, max) puzzles per user per period."""
    agg = (
        sub.group_by(group_cols)
        .agg(pl.col("puzzle_key").n_unique().alias("puzzles"))
    )
    return agg["puzzles"].mean(), agg["puzzles"].median(), agg["puzzles"].max()

hs("3. Puzzles per User per Day (by mode)")

rows_table = []
for mode, label in MODE_LABELS.items():
    sub = df.filter(pl.col("mode") == mode)
    if len(sub) == 0:
        continue
    p_avg, p_med, p_max = per_period_stats(sub.filter(pl.col("is_paid")), ["user_id", "date"])
    f_avg, f_med, f_max = per_period_stats(sub.filter(~pl.col("is_paid")), ["user_id", "date"])
    rows_table.append([
        label,
        f"{p_avg:.2f}" if p_avg else "—", f"{p_med:.1f}" if p_med else "—", int(p_max) if p_max else "—",
        f"{f_avg:.2f}" if f_avg else "—", f"{f_med:.1f}" if f_med else "—", int(f_max) if f_max else "—",
    ])
pt(rows_table,
    ["Mode", "Paid Avg", "Paid Med", "Paid Max", "Free Avg", "Free Med", "Free Max"])

# Per difficulty × paid/free (book and of-the-day)
for mode, label in [("book", "Sudoku Book"), ("oftheday", "Sudoku of the Day")]:
    sub = df.filter(pl.col("mode") == mode)
    if len(sub) == 0 or sub["diff_label"].n_unique() <= 1:
        continue

    print(f"\n--- {label} — puzzles/user/day by difficulty ---\n")
    html_section(f"{label} — puzzles/user/day by difficulty", level=4)
    diffs_sorted = (
        sub.select(["diff_label", "diff_sort"]).unique().sort("diff_sort")["diff_label"].to_list()
    )
    table = []
    for diff in diffs_sorted:
        dsub = sub.filter(pl.col("diff_label") == diff)
        p_avg, p_med, p_max = per_period_stats(dsub.filter(pl.col("is_paid")), ["user_id", "date"])
        f_avg, f_med, f_max = per_period_stats(dsub.filter(~pl.col("is_paid")), ["user_id", "date"])
        table.append([
            diff,
            f"{p_avg:.2f}" if p_avg else "—", f"{p_med:.1f}" if p_med else "—", int(p_max) if p_max else "—",
            f"{f_avg:.2f}" if f_avg else "—", f"{f_med:.1f}" if f_med else "—", int(f_max) if f_max else "—",
        ])
    pt(table,
        ["Difficulty", "Paid Avg", "Paid Med", "Paid Max", "Free Avg", "Free Med", "Free Max"])

# ---------------------------------------------------------------------------
# 5. Puzzles per user per week
# ---------------------------------------------------------------------------

hs("4. Puzzles per User per Week (by mode)")

rows_table = []
for mode, label in MODE_LABELS.items():
    sub = df.filter(pl.col("mode") == mode)
    if len(sub) == 0:
        continue
    p_avg, p_med, p_max = per_period_stats(sub.filter(pl.col("is_paid")), ["user_id", "year_week"])
    f_avg, f_med, f_max = per_period_stats(sub.filter(~pl.col("is_paid")), ["user_id", "year_week"])
    rows_table.append([
        label,
        f"{p_avg:.2f}" if p_avg else "—", f"{p_med:.1f}" if p_med else "—", int(p_max) if p_max else "—",
        f"{f_avg:.2f}" if f_avg else "—", f"{f_med:.1f}" if f_med else "—", int(f_max) if f_max else "—",
    ])
pt(rows_table,
    ["Mode", "Paid Avg", "Paid Med", "Paid Max", "Free Avg", "Free Med", "Free Max"])

# ---------------------------------------------------------------------------
# 6. Puzzles per user per month
# ---------------------------------------------------------------------------

hs("5. Puzzles per User per Month (by mode)")

rows_table = []
for mode, label in MODE_LABELS.items():
    sub = df.filter(pl.col("mode") == mode)
    if len(sub) == 0:
        continue
    p_avg, p_med, p_max = per_period_stats(sub.filter(pl.col("is_paid")), ["user_id", "year_month"])
    f_avg, f_med, f_max = per_period_stats(sub.filter(~pl.col("is_paid")), ["user_id", "year_month"])
    rows_table.append([
        label,
        f"{p_avg:.2f}" if p_avg else "—", f"{p_med:.1f}" if p_med else "—", int(p_max) if p_max else "—",
        f"{f_avg:.2f}" if f_avg else "—", f"{f_med:.1f}" if f_med else "—", int(f_max) if f_max else "—",
    ])
pt(rows_table,
    ["Mode", "Paid Avg", "Paid Med", "Paid Max", "Free Avg", "Free Med", "Free Max"])

# Monthly cross-table
monthly = (
    df.filter(pl.col("mode") != "other")
    .group_by(["year_month", "mode"])
    .agg(
        pl.col("user_id").filter(pl.col("is_paid")).n_unique().alias("paid_users"),
        pl.col("user_id").filter(~pl.col("is_paid")).n_unique().alias("free_users"),
        pl.col("puzzle_key").n_unique().alias("puzzles"),
    )
    .sort(["year_month", "mode"])
)

months = sorted(monthly["year_month"].unique().to_list())
modes_list = ["oftheday", "book", "scan"]
header = ["Month"] + [f"{MODE_LABELS[m]} (paid/free/puzzles)" for m in modes_list]
table = []
for ym in months:
    row = [ym]
    sub_month = monthly.filter(pl.col("year_month") == ym)
    for m in modes_list:
        r = sub_month.filter(pl.col("mode") == m)
        if len(r):
            paid = r["paid_users"][0]
            free = r["free_users"][0]
            p = r["puzzles"][0]
            row.append(f"{paid}p / {free}f / {p}puz")
        else:
            row.append("—")
    table.append(row)

html_section("Monthly breakdown (paid/free users and unique puzzles per mode)", level=3)
pt(table, header)

# ---------------------------------------------------------------------------
# 7. Time per user per day/week by mode
# ---------------------------------------------------------------------------

def time_stats(sub, group_cols):
    if len(sub) == 0:
        return None, None, None
    agg = sub.group_by(group_cols).agg((pl.col("total_seconds").sum() / 60).alias("minutes"))
    return agg["minutes"].mean(), agg["minutes"].median(), agg["minutes"].max()

hs("6. Time Spent per User per Day (minutes, by mode)")

rows_table = []
for mode, label in MODE_LABELS.items():
    timed = df.filter((pl.col("mode") == mode) & (pl.col("total_seconds") > 60))
    if len(timed) == 0:
        continue
    p_avg, p_med, p_max = time_stats(timed.filter(pl.col("is_paid")), ["user_id", "date"])
    f_avg, f_med, f_max = time_stats(timed.filter(~pl.col("is_paid")), ["user_id", "date"])
    rows_table.append([
        label,
        f"{p_avg:.1f}m" if p_avg else "—", f"{p_med:.1f}m" if p_med else "—", f"{p_max:.1f}m" if p_max else "—",
        f"{f_avg:.1f}m" if f_avg else "—", f"{f_med:.1f}m" if f_med else "—", f"{f_max:.1f}m" if f_max else "—",
    ])
pt(rows_table,
    ["Mode", "Paid Avg", "Paid Med", "Paid Max", "Free Avg", "Free Med", "Free Max"])

hs("7. Time Spent per User per Week (minutes, by mode)")

rows_table = []
for mode, label in MODE_LABELS.items():
    timed = df.filter((pl.col("mode") == mode) & (pl.col("total_seconds") > 60))
    if len(timed) == 0:
        continue
    p_avg, p_med, p_max = time_stats(timed.filter(pl.col("is_paid")), ["user_id", "year_week"])
    f_avg, f_med, f_max = time_stats(timed.filter(~pl.col("is_paid")), ["user_id", "year_week"])
    rows_table.append([
        label,
        f"{p_avg:.1f}m" if p_avg else "—", f"{p_med:.1f}m" if p_med else "—", f"{p_max:.1f}m" if p_max else "—",
        f"{f_avg:.1f}m" if f_avg else "—", f"{f_med:.1f}m" if f_med else "—", f"{f_max:.1f}m" if f_max else "—",
    ])
pt(rows_table,
    ["Mode", "Paid Avg", "Paid Med", "Paid Max", "Free Avg", "Free Med", "Free Max"])

# ---------------------------------------------------------------------------
# 8. Most popular puzzles (session_id shared across players)
# ---------------------------------------------------------------------------

hs("8. Most Popular Puzzles (by player count)")

for mode, label in MODE_LABELS.items():
    sub = df.filter(pl.col("mode") == mode)
    if len(sub) == 0:
        continue

    popular = (
        sub.group_by("puzzle_key")
        .agg([
            pl.col("user_id").filter(pl.col("is_paid")).n_unique().alias("paid_players"),
            pl.col("user_id").filter(~pl.col("is_paid")).n_unique().alias("free_players"),
            pl.col("diff_label").first().alias("difficulty"),
            pl.col("date").min().alias("first_played"),
        ])
        .with_columns((pl.col("paid_players") + pl.col("free_players")).alias("total_players"))
        .sort("total_players", descending=True)
        .head(10)
    )

    print(f"\n--- {label} ---\n")
    html_section(label, level=3)
    table = [
        [r["puzzle_key"][:50], r["difficulty"], r["total_players"], r["paid_players"], r["free_players"], str(r["first_played"])]
        for r in popular.iter_rows(named=True)
    ]
    pt(table, ["Puzzle ID", "Difficulty", "Total Players", "Paid Players", "Free Players", "First Played"])

# ---------------------------------------------------------------------------
# 9. Party stats
# ---------------------------------------------------------------------------

hs("9. Party Stats")

total_parties = len(party_records)
multi_parties = len(multi_member_parties)
solo_parties = total_parties - multi_parties
all_session_users = set(df["user_id"].unique().to_list())
hp(f"Total parties created: {total_parties}")
hp(f"Multi-member parties (2+): {multi_parties}")
hp(f"Solo parties (1 member): {solo_parties}")
hp(f"Total party memberships: {len(member_records)}")
hp(f"Unique users in any party: {len(user_parties)}")
hp(f"Users in 1 multi-member party: {len(party_users - multi_party_users)}")
hp(f"Users in 2+ multi-member parties: {len(multi_party_users)}")
hp(f"Party users with sessions: {len(party_users & all_session_users)}")
hp(f"Multi-party users with sessions: {len(multi_party_users & all_session_users)}")

# Party size distribution
size_dist = _Counter(party_member_count.values())
html_section("Party size distribution", level=3)
pt(
    [[size, count] for size, count in sorted(size_dist.items())],
    ["Members", "Parties"],
)

# Sessions from party users vs solo users
party_sess = df.filter(pl.col("in_party"))
solo_sess  = df.filter(~pl.col("in_party"))
html_section("Sessions: party users vs solo users", level=3)
pt([
    ["In a party",  party_sess["user_id"].n_unique(),
     party_sess.filter(pl.col("is_paid"))["user_id"].n_unique(),
     party_sess.filter(~pl.col("is_paid"))["user_id"].n_unique(),
     len(party_sess)],
    ["Solo (no party)", solo_sess["user_id"].n_unique(),
     solo_sess.filter(pl.col("is_paid"))["user_id"].n_unique(),
     solo_sess.filter(~pl.col("is_paid"))["user_id"].n_unique(),
     len(solo_sess)],
], ["Group", "Users", "Paid Users", "Free Users", "Sessions"])

# Multi-party users breakdown
multi_sess  = df.filter(pl.col("in_multi_party"))
single_sess = df.filter(pl.col("in_party") & ~pl.col("in_multi_party"))
solo_sess2  = df.filter(~pl.col("in_party"))

html_section("Users by party membership count", level=3)
pt([
    ["In 2+ parties",  multi_sess["user_id"].n_unique(),
     multi_sess.filter(pl.col("is_paid"))["user_id"].n_unique(),
     multi_sess.filter(~pl.col("is_paid"))["user_id"].n_unique(),
     len(multi_sess),
     multi_sess["is_completed"].sum(),
     len(multi_sess) - multi_sess["is_completed"].sum()],
    ["In 1 party", single_sess["user_id"].n_unique(),
     single_sess.filter(pl.col("is_paid"))["user_id"].n_unique(),
     single_sess.filter(~pl.col("is_paid"))["user_id"].n_unique(),
     len(single_sess),
     single_sess["is_completed"].sum(),
     len(single_sess) - single_sess["is_completed"].sum()],
    ["Solo (no party)", solo_sess2["user_id"].n_unique(),
     solo_sess2.filter(pl.col("is_paid"))["user_id"].n_unique(),
     solo_sess2.filter(~pl.col("is_paid"))["user_id"].n_unique(),
     len(solo_sess2),
     solo_sess2["is_completed"].sum(),
     len(solo_sess2) - solo_sess2["is_completed"].sum()],
], ["Group", "Users", "Paid", "Free", "Sessions", "Completed", "Abandoned"])

# Multi-party users — who are they?
html_section("Users in 2+ multi-member parties", level=3)
mp_table = []
for uid in sorted(multi_party_users, key=lambda u: -user_multi_party_count.get(u, 0)):
    nickname = user_nicknames.get(uid, "—")
    n_parties = user_multi_party_count.get(uid, 0)
    sessions = len(df.filter(pl.col("user_id") == uid))
    completed = df.filter(pl.col("user_id") == uid)["is_completed"].sum()
    tier = "Paid" if uid in paid_users else "Free"
    mp_table.append([nickname, uid, tier, n_parties, sessions, completed])
pt(mp_table,
    ["Nickname", "User ID", "Tier", "Parties", "Sessions", "Completed"])

# Play mode breakdown for party vs solo users
html_section("Play mode breakdown: party users vs solo users", level=3)
mode_party_rows = []
for mode, label in MODE_LABELS.items():
    p = df.filter((pl.col("mode") == mode) & pl.col("in_party"))
    s = df.filter((pl.col("mode") == mode) & ~pl.col("in_party"))
    mode_party_rows.append([
        label,
        len(p), p["user_id"].n_unique(),
        p.filter(pl.col("is_paid"))["user_id"].n_unique(),
        p.filter(~pl.col("is_paid"))["user_id"].n_unique(),
        len(s), s["user_id"].n_unique(),
        s.filter(pl.col("is_paid"))["user_id"].n_unique(),
        s.filter(~pl.col("is_paid"))["user_id"].n_unique(),
    ])
pt(mode_party_rows, [
    "Mode",
    "Party Sessions", "Party Users", "Party Paid", "Party Free",
    "Solo Sessions",  "Solo Users",  "Solo Paid",  "Solo Free",
])

# Per-party detail: name, size, members' paid/free status, modes played
html_section("Per-party breakdown (multi-member parties, sorted by size)", level=3)

# Build user->paid lookup
user_is_paid = {uid: uid in paid_users for uid in user_parties}

party_rows = []
for party_id in sorted(multi_member_parties,
                       key=lambda pid: -party_member_count[pid]):
    party_name = party_records.get(party_id, {}).get("party_name", "?")
    member_uids = {m["user_id"] for m in member_records if m["party_id"] == party_id}
    size = len(member_uids)
    paid_members  = sum(1 for uid in member_uids if uid in paid_users)
    free_members  = size - paid_members
    # Sessions from members of this party
    party_df = df.filter(pl.col("user_id").is_in(list(member_uids)))
    n_sessions = len(party_df)
    modes_played = sorted(party_df["mode"].unique().to_list()) if n_sessions else []
    mode_str = ", ".join(MODE_LABELS.get(m, m) for m in modes_played) if modes_played else "—"
    party_rows.append([party_name, size, paid_members, free_members, n_sessions, mode_str])

pt(party_rows, [
    "Party Name", "Members", "Paid Members", "Free Members", "Sessions", "Modes Played"
])

# ---------------------------------------------------------------------------
# 10. Dormant members — joined a party but never played
# ---------------------------------------------------------------------------

hs("10. Dormant Members (joined a party, never played)")

all_session_user_ids = set(df["user_id"].unique().to_list())
all_member_user_ids  = {m["user_id"] for m in member_records if m["user_id"]}
dormant_user_ids     = all_member_user_ids - all_session_user_ids

hp(f"Total unique users who joined any party: {len(all_member_user_ids)}")
hp(f"Of those, never played a single session: {len(dormant_user_ids)}")
hp(f"(These people accepted an invite or joined a party but have no recorded puzzle sessions.)")

# For each dormant user collect: nickname, parties they're in, party names,
# most recent party join date (createdAt on the member record), party sizes.
dormant_rows_data = []
for m in member_records:
    uid = m["user_id"]
    if uid not in dormant_user_ids:
        continue
    party_id   = m["party_id"]
    nickname   = m.get("nickname") or user_nicknames.get(uid, "—")
    party_name = party_records.get(party_id, {}).get("party_name", "?")
    party_size = party_member_count.get(party_id, 1)
    joined_ts  = m.get("created_at", 0)
    joined_dt  = datetime.fromtimestamp(joined_ts, tz=timezone.utc) if joined_ts else None
    joined_str = joined_dt.strftime("%Y-%m-%d") if joined_dt else "—"
    dormant_rows_data.append({
        "uid": uid,
        "nickname": nickname,
        "party_id": party_id,
        "party_name": party_name,
        "party_size": party_size,
        "joined_ts": joined_ts,
        "joined_str": joined_str,
    })

# Collapse to one row per user: show their most recently joined party and
# how many parties they belong to in total.
from collections import defaultdict as _dd
dormant_by_user: dict[str, list] = _dd(list)
for r in dormant_rows_data:
    dormant_by_user[r["uid"]].append(r)

dormant_table = []
for uid, entries in sorted(
    dormant_by_user.items(),
    key=lambda kv: -max(e["joined_ts"] for e in kv[1])
):
    latest = max(entries, key=lambda e: e["joined_ts"])
    nickname   = latest["nickname"]
    n_parties  = len(entries)
    # Prefer multi-member parties to flag users whose party actually has people
    max_size   = max(e["party_size"] for e in entries)
    party_names = ", ".join(
        e["party_name"] for e in sorted(entries, key=lambda e: -e["party_size"])[:3]
    )
    dormant_table.append([
        nickname, uid, n_parties, max_size, latest["joined_str"], party_names,
    ])

html_section("Dormant members — full list (sorted by most recent join)", level=3)
pt(dormant_table, [
    "Nickname", "User ID", "Parties Joined", "Largest Party Size",
    "Last Joined", "Party Name(s)",
])

# Summarise by how many parties they joined (signal of intent)
html_section("Dormant members — grouped by party count", level=3)
buckets_d: dict[str, list] = {"1 party": [], "2–3 parties": [], "4+ parties": []}
for uid, entries in dormant_by_user.items():
    n = len(entries)
    if n == 1:
        buckets_d["1 party"].append(uid)
    elif n <= 3:
        buckets_d["2–3 parties"].append(uid)
    else:
        buckets_d["4+ parties"].append(uid)

bucket_table = []
for label_b, uids_b in buckets_d.items():
    # subset of dormant_table rows for these uids
    max_sizes = [max(e["party_size"] for e in dormant_by_user[u]) for u in uids_b]
    in_multi  = sum(1 for s in max_sizes if s >= 2)
    bucket_table.append([label_b, len(uids_b), in_multi])
pt(bucket_table, ["Group", "Dormant Users", "In a Multi-member Party"])

hp("Priority for re-engagement: users in multi-member parties (party_size ≥ 2) who joined recently.")

# ---------------------------------------------------------------------------
# 11. Visualisations
# ---------------------------------------------------------------------------

hs("11. Charts")

# ── helpers ────────────────────────────────────────────────────────────────

def save(fig, name, caption=""):
    path = f"{CHARTS_DIR}/{name}"
    fig.savefig(path, bbox_inches="tight", dpi=150)
    html_fig(fig, caption or name)
    plt.close(fig)
    print(f"  Saved: {path}")

# ── 1. Sessions by month, stacked by play mode ─────────────────────────────

months_ordered = sorted(df["year_month"].unique().to_list())
modes_order = ["oftheday", "book", "scan", "other"]

month_mode = (
    df.group_by(["year_month", "mode"])
    .agg(pl.len().alias("n"))
    .sort(["year_month", "mode"])
)

fig, ax = plt.subplots(figsize=(10, 5))
bottoms = np.zeros(len(months_ordered))
for mode in modes_order:
    vals = []
    for ym in months_ordered:
        row = month_mode.filter((pl.col("year_month") == ym) & (pl.col("mode") == mode))
        vals.append(row["n"][0] if len(row) else 0)
    ax.bar(months_ordered, vals, bottom=bottoms, label=MODE_LABELS[mode],
           color=MODE_COLORS[mode])
    bottoms += np.array(vals)

ax.set_title("Sessions per Month by Play Mode")
ax.set_xlabel("Month")
ax.set_ylabel("Sessions")
ax.legend()
plt.xticks(rotation=45, ha="right")
save(fig, "01_sessions_by_month.png")

# ── 2. Play mode split: paid vs free (grouped bar) ─────────────────────────

fig, ax = plt.subplots(figsize=(9, 5))
x = np.arange(len(MODE_LABELS))
w = 0.35
paid_counts = [df.filter((pl.col("mode") == m) & pl.col("is_paid"))["user_id"].n_unique()
               for m in MODE_LABELS]
free_counts = [df.filter((pl.col("mode") == m) & ~pl.col("is_paid"))["user_id"].n_unique()
               for m in MODE_LABELS]
bars_p = ax.bar(x - w/2, paid_counts, w, label="Paid", color=PAID_COLOR)
bars_f = ax.bar(x + w/2, free_counts, w, label="Free", color=FREE_COLOR)
ax.bar_label(bars_p, padding=2)
ax.bar_label(bars_f, padding=2)
ax.set_title("Unique Users per Play Mode: Paid vs Free")
ax.set_xticks(x)
ax.set_xticklabels(list(MODE_LABELS.values()), rotation=15, ha="right")
ax.set_ylabel("Unique users")
ax.legend()
save(fig, "02_users_by_mode_paid_free.png")

# ── 3. Completed vs abandoned by mode ──────────────────────────────────────

fig, ax = plt.subplots(figsize=(9, 5))
labels_m = list(MODE_LABELS.values())
comp   = [df.filter(pl.col("mode") == m)["is_completed"].sum() for m in MODE_LABELS]
aband  = [len(df.filter(pl.col("mode") == m)) - c for m, c in zip(MODE_LABELS, comp)]
ax.bar(labels_m, comp,  label="Completed", color=COMP_COLOR)
ax.bar(labels_m, aband, bottom=comp, label="Abandoned", color=ABAND_COLOR)
for i, (c, a) in enumerate(zip(comp, aband)):
    total = c + a
    if total:
        ax.text(i, total + 1, f"{c/total*100:.0f}%\ncomplete", ha="center",
                va="bottom", fontsize=8)
ax.set_title("Completed vs Abandoned Sessions by Play Mode")
ax.set_ylabel("Sessions")
ax.legend()
save(fig, "03_completed_vs_abandoned_by_mode.png")

# ── 4. Completed vs abandoned by difficulty (book only) ────────────────────

book_diff = (
    df.filter(pl.col("mode") == "book")
    .group_by(["diff_label", "diff_sort"])
    .agg([
        pl.col("is_completed").sum().alias("completed"),
        pl.len().alias("total"),
    ])
    .sort("diff_sort")
)

fig, ax = plt.subplots(figsize=(11, 5))
diff_labels = book_diff["diff_label"].to_list()
comp_v  = book_diff["completed"].to_list()
aband_v = [t - c for t, c in zip(book_diff["total"].to_list(), comp_v)]
ax.bar(diff_labels, comp_v,  label="Completed", color=COMP_COLOR)
ax.bar(diff_labels, aband_v, bottom=comp_v, label="Abandoned", color=ABAND_COLOR)
for i, (c, a) in enumerate(zip(comp_v, aband_v)):
    total = c + a
    if total:
        ax.text(i, total + 0.3, f"{c/total*100:.0f}%", ha="center", va="bottom", fontsize=8)
ax.set_title("Completed vs Abandoned: Sudoku Book by Difficulty")
ax.set_ylabel("Sessions")
ax.legend()
plt.xticks(rotation=30, ha="right")
save(fig, "04_book_completed_by_difficulty.png")

# ── 5. Median completion time by difficulty (book) ─────────────────────────

book_times = (
    df.filter((pl.col("mode") == "book") & pl.col("is_completed") & (pl.col("total_seconds") > 0))
    .group_by(["diff_label", "diff_sort"])
    .agg(pl.col("total_seconds").median().alias("median_s"))
    .sort("diff_sort")
)

fig, ax = plt.subplots(figsize=(11, 5))
dl = book_times["diff_label"].to_list()
med_min = [s / 60 for s in book_times["median_s"].to_list()]
bars = ax.bar(dl, med_min, color="#4C72B0")
ax.bar_label(bars, labels=[f"{m:.1f}m" for m in med_min], padding=2, fontsize=8)
ax.set_title("Median Completion Time by Difficulty (Sudoku Book)")
ax.set_ylabel("Minutes")
plt.xticks(rotation=30, ha="right")
save(fig, "05_book_median_time_by_difficulty.png")

# ── 6. Solve time distribution: paid vs free (box plot, of-the-day) ────────

otd_paid = df.filter((pl.col("mode") == "oftheday") & pl.col("is_paid") &
                      pl.col("is_completed") & (pl.col("total_seconds") > 0)
                      )["total_seconds"].to_list()
otd_free = df.filter((pl.col("mode") == "oftheday") & ~pl.col("is_paid") &
                      pl.col("is_completed") & (pl.col("total_seconds") > 0)
                      )["total_seconds"].to_list()
otd_paid_min = [s / 60 for s in otd_paid]
otd_free_min = [s / 60 for s in otd_free]

fig, ax = plt.subplots(figsize=(7, 5))
bp = ax.boxplot([otd_paid_min, otd_free_min], tick_labels=["Paid", "Free"],
                patch_artist=True, medianprops=dict(color="white", linewidth=2))
bp["boxes"][0].set_facecolor(PAID_COLOR)
bp["boxes"][1].set_facecolor(FREE_COLOR)
# Cap y-axis at 99th percentile of combined data to suppress corrupt outliers
all_times = otd_paid_min + otd_free_min
p99 = float(np.percentile(all_times, 99)) if all_times else 60
ax.set_ylim(0, p99 * 1.1)
ax.set_title("Completion Time Distribution: Sudoku of the Day\n(Paid vs Free)")
ax.set_ylabel("Minutes")
save(fig, "06_otd_solve_time_paid_vs_free.png")

# ── 7. Puzzles completed per user per day: paid vs free ────────────────────

def completed_per_day(tier_filter):
    return (
        df.filter(tier_filter & pl.col("is_completed"))
        .group_by(["user_id", "date"])
        .agg(pl.len().alias("n"))
        ["n"].to_list()
    )

paid_cpd = completed_per_day(pl.col("is_paid"))
free_cpd = completed_per_day(~pl.col("is_paid"))

fig, ax = plt.subplots(figsize=(8, 5))
max_val = max(max(paid_cpd, default=0), max(free_cpd, default=0))
bins = np.arange(0.5, max_val + 1.5, 1)
ax.hist(paid_cpd, bins=bins, alpha=0.7, label="Paid", color=PAID_COLOR, density=False)
ax.hist(free_cpd, bins=bins, alpha=0.7, label="Free", color=FREE_COLOR, density=False)
ax.set_title("Puzzles Completed per User per Day")
ax.set_xlabel("Puzzles completed in a day")
ax.set_ylabel("User-days")
ax.set_xticks(range(1, max_val + 1))
ax.legend()
save(fig, "07_completed_per_user_per_day.png")

# ── 8. Top 15 most active users (sessions), coloured by paid/free ──────────

top_users = (
    df.group_by("user_id")
    .agg([
        pl.len().alias("sessions"),
        pl.col("is_completed").sum().alias("completed"),
        pl.col("is_paid").first().alias("paid"),
    ])
    .sort("sessions", descending=True)
    .head(15)
)

fig, ax = plt.subplots(figsize=(10, 6))
names   = [user_nicknames.get(uid, uid[:12]) for uid in top_users["user_id"].to_list()]
sessions_v  = top_users["sessions"].to_list()
completed_v = top_users["completed"].to_list()
abandoned_v = [s - c for s, c in zip(sessions_v, completed_v)]
colors  = [PAID_COLOR if p else FREE_COLOR for p in top_users["paid"].to_list()]
y = np.arange(len(names))
ax.barh(y, completed_v, color=COMP_COLOR,  label="Completed")
ax.barh(y, abandoned_v, left=completed_v, color=ABAND_COLOR, label="Abandoned")
for i, (uid, paid) in enumerate(zip(top_users["user_id"].to_list(), top_users["paid"].to_list())):
    marker = "★" if paid else "○"
    ax.text(-0.5, i, marker, ha="right", va="center",
            color=PAID_COLOR if paid else FREE_COLOR, fontsize=10)
ax.set_yticks(y)
ax.set_yticklabels(names)
ax.invert_yaxis()
ax.set_title("Top 15 Most Active Users (★ = Paid, ○ = Free)")
ax.set_xlabel("Sessions")
paid_patch  = mpatches.Patch(color=PAID_COLOR,  label="Paid user")
free_patch  = mpatches.Patch(color=FREE_COLOR,  label="Free user")
comp_patch  = mpatches.Patch(color=COMP_COLOR,  label="Completed")
aband_patch = mpatches.Patch(color=ABAND_COLOR, label="Abandoned")
ax.legend(handles=[paid_patch, free_patch, comp_patch, aband_patch], loc="lower right")
save(fig, "08_top_users.png")

# ── 9. Party membership vs sessions (scatter, paid/free coloured) ──────────

scatter_rows = []
for uid in set(df["user_id"].unique().to_list()):
    n_sess = len(df.filter(pl.col("user_id") == uid))
    n_p = user_multi_party_count.get(uid, 0)
    paid = uid in paid_users
    scatter_rows.append((n_p, n_sess, paid))

fig, ax = plt.subplots(figsize=(8, 5))
for paid, color, label in [(True, PAID_COLOR, "Paid"), (False, FREE_COLOR, "Free")]:
    pts = [(p, s) for p, s, is_p in scatter_rows if is_p == paid]
    if pts:
        xs, ys = zip(*pts)
        ax.scatter(xs, ys, c=color, label=label, alpha=0.75, s=60)
ax.set_title("Party Memberships vs Sessions per User")
ax.set_xlabel("Number of multi-member parties")
ax.set_ylabel("Total sessions")
ax.legend()
save(fig, "09_party_count_vs_sessions.png")

# ── 10. Paid vs free users over time (cumulative new users by month) ──────

first_session = (
    df.group_by("user_id")
    .agg([
        pl.col("year_month").min().alias("first_month"),
        pl.col("is_paid").first().alias("paid"),
    ])
    .sort("first_month")
)

all_months_sorted = sorted(first_session["first_month"].unique().to_list())

fig, ax = plt.subplots(figsize=(10, 5))
for paid, color, label in [(True, PAID_COLOR, "Paid"), (False, FREE_COLOR, "Free")]:
    sub = (
        first_session.filter(pl.col("paid") == paid)
        .group_by("first_month")
        .agg(pl.len().alias("new_users"))
        .sort("first_month")
    )
    month_counts = {r["first_month"]: r["new_users"] for r in sub.iter_rows(named=True)}
    cumulative, running = [], 0
    months_x = []
    for m in all_months_sorted:
        running += month_counts.get(m, 0)
        cumulative.append(running)
        months_x.append(m)
    ax.plot(months_x, cumulative, marker="o", color=color, label=label)

ax.set_title("Cumulative Users over Time: Paid vs Free")
ax.set_xlabel("Month of first session")
ax.set_ylabel("Cumulative users")
ax.legend()
plt.xticks(rotation=45, ha="right")
save(fig, "10_cumulative_users_over_time.png")

print(f"\n  All charts saved to {CHARTS_DIR}/")

# ---------------------------------------------------------------------------
# 11. Play timing: day of week & hour of day
# ---------------------------------------------------------------------------

DOW_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

hs("12. When People Play")

# ── Day-of-week table ───────────────────────────────────────────────────────

dow_df = df.filter(pl.col("play_dow").is_not_null())
dow_table = []
for dow in range(7):
    sub = dow_df.filter(pl.col("play_dow") == dow)
    n_paid = sub.filter(pl.col("is_paid"))["user_id"].n_unique()
    n_free = sub.filter(~pl.col("is_paid"))["user_id"].n_unique()
    n_comp = sub["is_completed"].sum()
    n_aband = len(sub) - n_comp
    dow_table.append([DOW_LABELS[dow], len(sub), n_paid, n_free, n_comp, n_aband])

html_section("Sessions by Day of Week", level=3)
pt(dow_table, ["Day", "Sessions", "Paid Users", "Free Users", "Completed", "Abandoned"])

# ── Hour-of-day table (UTC) ─────────────────────────────────────────────────

hour_df = df.filter(pl.col("play_hour").is_not_null())
hour_table = []
for hour in range(24):
    sub = hour_df.filter(pl.col("play_hour") == hour)
    if len(sub) == 0:
        continue
    n_comp = sub["is_completed"].sum()
    hour_table.append([f"{hour:02d}:00", len(sub), n_comp, len(sub) - n_comp])

html_section("Sessions by Hour of Day (UTC)", level=3)
pt(hour_table, ["Hour (UTC)", "Sessions", "Completed", "Abandoned"])

# ── Chart 11: Day-of-week bar, paid vs free stacked ─────────────────────────

fig, ax = plt.subplots(figsize=(9, 5))
x = np.arange(7)
paid_dow = [
    len(dow_df.filter((pl.col("play_dow") == d) & pl.col("is_paid")))
    for d in range(7)
]
free_dow = [
    len(dow_df.filter((pl.col("play_dow") == d) & ~pl.col("is_paid")))
    for d in range(7)
]
bars_p = ax.bar(x, paid_dow, label="Paid", color=PAID_COLOR)
bars_f = ax.bar(x, free_dow, bottom=paid_dow, label="Free", color=FREE_COLOR)
ax.set_title("Sessions by Day of Week")
ax.set_xticks(x)
ax.set_xticklabels(DOW_LABELS)
ax.set_ylabel("Sessions")
ax.legend()
for i, (p, f) in enumerate(zip(paid_dow, free_dow)):
    total = p + f
    if total:
        ax.text(i, total + 0.5, str(total), ha="center", va="bottom", fontsize=8)
save(fig, "11_sessions_by_day_of_week.png", "Sessions by Day of Week (paid vs free)")

# ── Chart 12: Hour-of-day bar ────────────────────────────────────────────────

fig, ax = plt.subplots(figsize=(12, 5))
hours = list(range(24))
paid_hour = [
    len(hour_df.filter((pl.col("play_hour") == h) & pl.col("is_paid")))
    for h in hours
]
free_hour = [
    len(hour_df.filter((pl.col("play_hour") == h) & ~pl.col("is_paid")))
    for h in hours
]
ax.bar(hours, paid_hour, label="Paid", color=PAID_COLOR)
ax.bar(hours, free_hour, bottom=paid_hour, label="Free", color=FREE_COLOR)
ax.set_title("Sessions by Hour of Day (UTC)")
ax.set_xlabel("Hour (UTC)")
ax.set_ylabel("Sessions")
ax.set_xticks(hours)
ax.set_xticklabels([f"{h:02d}" for h in hours], fontsize=8)
ax.legend()
save(fig, "12_sessions_by_hour.png", "Sessions by Hour of Day UTC (paid vs free)")

# ── Chart 13: Heatmap — day of week × hour of day ───────────────────────────

heat = np.zeros((7, 24), dtype=int)
for row in df.filter(
    pl.col("play_dow").is_not_null() & pl.col("play_hour").is_not_null()
).select(["play_dow", "play_hour"]).iter_rows():
    dow_val, hour_val = row
    if dow_val is not None and hour_val is not None:
        heat[int(dow_val), int(hour_val)] += 1

fig, ax = plt.subplots(figsize=(14, 5))
im = ax.imshow(heat, aspect="auto", cmap="YlOrRd", interpolation="nearest")
ax.set_yticks(range(7))
ax.set_yticklabels(DOW_LABELS)
ax.set_xticks(range(24))
ax.set_xticklabels([f"{h:02d}" for h in range(24)], fontsize=8)
ax.set_xlabel("Hour of Day (UTC)")
ax.set_title("Session Heatmap: Day of Week × Hour of Day (UTC)")
plt.colorbar(im, ax=ax, label="Sessions")
# Annotate cells with count where non-zero
for dow_i in range(7):
    for hour_i in range(24):
        val = heat[dow_i, hour_i]
        if val > 0:
            ax.text(hour_i, dow_i, str(val), ha="center", va="center",
                    fontsize=7, color="black" if val < heat.max() * 0.6 else "white")
save(fig, "13_heatmap_dow_hour.png",
     "Session heatmap by day of week and hour of day (UTC). Darker = more sessions.")

write_report()
print("\n\nDone.")
