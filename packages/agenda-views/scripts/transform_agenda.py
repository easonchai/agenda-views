#!/usr/bin/env python3
"""
Convert the scraped aimto.my programme into the app's typed session list.

    python3 scripts/transform_agenda.py [out.json]

Reads scripts/agenda-scraped.json (raw DOM extraction) and writes
src/data/agenda.json by default.
"""
import json, re, sys, unicodedata
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "src/data/agenda.json"

RAW = json.loads((HERE / "agenda-scraped.json").read_text())

DAY_META = [
    {"id": "day-1", "date": "2026-08-11", "label": "Day 1", "short": "11 Aug", "weekday": "Tuesday"},
    {"id": "day-2", "date": "2026-08-12", "label": "Day 2", "short": "12 Aug", "weekday": "Wednesday"},
]

STAGES = [
    {"id": "war-room", "name": "War Room", "short": "War Room", "venue": "Robert's Theatre, Ground Floor", "accent": "amber"},
    {"id": "sandbox", "name": "Sandbox", "short": "Sandbox", "venue": "Assembly Hall, Ground Floor", "accent": "emerald"},
    {"id": "pasar-ai", "name": "Pasar AI", "short": "Pasar AI", "venue": "Champion's Court, Ground Floor", "accent": "violet"},
    {"id": "masterclass", "name": "Masterclass & Workshop", "short": "Masterclass", "venue": "Padang Teduh, Lower Ground Floor", "accent": "sky"},
]
STAGE_BY_NAME = {s["name"]: s["id"] for s in STAGES}


def slug(text, maxlen=48):
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return text[:maxlen].strip("-")


def clean(s):
    if not s:
        return ""
    return (s.replace("’", "'").replace("‘", "'")
             .replace("“", '"').replace("”", '"')
             .replace("—", "—").strip())


sessions = []
seen = set()

for day_idx, day in enumerate(RAW["days"]):
    meta = DAY_META[day_idx]
    for cluster in day["clusters"]:
        start, end = cluster["start"], cluster["end"]
        for s in cluster["sessions"]:
            title_raw = clean(s["title"])
            fmt = None
            m = re.match(r"^\[([^\]]+)\]\s*(.*)$", title_raw)
            if m:
                fmt = m.group(1).strip().upper()
                title = m.group(2).strip()
            else:
                title = title_raw
            stage_name = clean(s["stage"])
            stage_id = STAGE_BY_NAME.get(stage_name)
            all_stages = stage_id is None  # "All Stages" -> plenary/break row
            sid = f"{meta['id']}-{slug(title)}"
            n = 2
            base = sid
            while sid in seen:
                sid = f"{base}-{n}"
                n += 1
            seen.add(sid)

            speakers = []
            for sp in s["speakers"]:
                name = clean(sp["name"]).rstrip("▸").strip()
                if not name:
                    continue
                speakers.append({
                    "name": name,
                    "org": clean(sp["org"]),
                    "avatar": sp["img"] or None,
                })

            sessions.append({
                "id": sid,
                "day": meta["id"],
                "start": start,
                "end": end,
                "stageId": stage_id,
                "allStages": all_stages,
                "format": fmt,
                "title": title,
                "description": clean(s["desc"]) or None,
                "location": clean(s["location"]) or None,
                "speakers": speakers,
            })


def to_min(t):
    h, m = t.split(":")
    return int(h) * 60 + int(m)


sessions.sort(key=lambda x: (x["day"], to_min(x["start"]), to_min(x["end"])))

out = {
    "timezone": "Asia/Kuala_Lumpur",
    "utcOffsetMinutes": 8 * 60,
    "days": DAY_META,
    "stages": STAGES,
    "sessions": sessions,
}
OUT.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n")
print(f"{len(sessions)} sessions -> {OUT}")
fmts = sorted({s["format"] for s in sessions if s["format"]})
print("formats:", fmts)
print("no-stage:", [s["title"] for s in sessions if s["allStages"]])
