#!/usr/bin/env python3
"""Publish one validated, never-repeated 3×3 children's crossword per day."""
import datetime as dt
import itertools
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
WORDS = ROOT / "data/kids-words.json"
OUTPUT = ROOT / "data/kids-published.json"
TZ = dt.timezone(dt.timedelta(hours=3, minutes=30))

def normalize(word):
    return str(word).replace("ي", "ی").replace("ك", "ک").replace("‌", "").replace(" ", "").strip()

def build(rows, clues):
    rows = tuple(normalize(w) for w in rows)
    downs = tuple("".join(row[col] for row in rows) for col in range(3))
    answers = rows + downs
    if len(set(answers)) != 6 or any(len(a) != 3 or a not in clues for a in answers):
        return None
    questions = [clues[w] for w in answers]
    if len(set(questions)) != 6 or any(not q.strip() for q in questions):
        return None
    return {"grid": [list(row) for row in rows],
            "across": [{"number": i+1, "answer": w, "clue": clues[w]} for i,w in enumerate(rows)],
            "down": [{"number": i+1, "answer": w, "clue": clues[w]} for i,w in enumerate(downs)]}

def validate(p, clues):
    if not isinstance(p.get("grid"), list) or len(p["grid"]) != 3:
        return False
    if any(len(row) != 3 for row in p["grid"]):
        return False
    rows = ["".join(row) for row in p["grid"]]
    regenerated = build(rows, clues)
    return regenerated is not None and p["across"] == regenerated["across"] and p["down"] == regenerated["down"]

def main():
    bank = json.loads(WORDS.read_text(encoding="utf-8"))["words"]
    clues = {normalize(x["answer"]): x["clue"].strip() for x in bank
             if x.get("reviewed") is True and len(normalize(x["answer"])) == 3}
    if len(clues) != len([x for x in bank if x.get("reviewed") is True and len(normalize(x["answer"])) == 3]):
        raise ValueError("Duplicate reviewed answers")
    archive = json.loads(OUTPUT.read_text(encoding="utf-8")) if OUTPUT.exists() else {"schema":1,"puzzles":[]}
    all_puzzles = archive["puzzles"]
    if any(not validate(p, clues) for p in all_puzzles):
        raise ValueError("Existing published puzzle failed validation; stop safely")
    today = dt.datetime.now(TZ).date().isoformat()
    if any(p.get("date") == today for p in all_puzzles):
        print("Already published today; no change")
        return
    prior = {tuple("".join(row) for row in p["grid"]) for p in all_puzzles}
    used = {a["answer"] for p in all_puzzles for side in ("across","down") for a in p[side]}
    preferred = [
        ("چوب","تار","رنگ"), ("چتر","ران","برگ"),
        ("چشم","نور","گرد"), ("چمن","شام","مرد"),
        ("آرد","توی","شیر"), ("داس","اسب","نمد")
    ]
    candidates = []
    for rows in itertools.chain(preferred, itertools.permutations(sorted(clues), 3)):
        if rows in prior:
            continue
        puzzle = build(rows, clues)
        if puzzle is None:
            continue
        answers = [a["answer"] for side in ("across","down") for a in puzzle[side]]
        score = (sum(w not in used for w in answers), -sum(w in used for w in answers))
        candidates.append((score, puzzle))
        if len(candidates) >= 50000:
            break
    if not candidates:
        print("No reviewed unique solution left; nothing published")
        return
    # Prefer fresh words while keeping the initial hand-reviewed showcase first.
    handpicked = next((build(r, clues) for r in preferred if r not in prior and build(r, clues)), None)
    chosen = handpicked or max(candidates, key=lambda item:item[0])[1]
    item = {"id": f"kids-{today}", "date":today, "title":f"جدول کودک {today}",
            "size":3, "age":"۷ تا ۹ سال", **chosen}
    assert validate(item, clues)
    all_puzzles.append(item)
    archive["updatedAt"] = today
    OUTPUT.write_text(json.dumps(archive, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    print("Published:", item["id"], "six unique answers and clues")

if __name__ == "__main__":
    main()
