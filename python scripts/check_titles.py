from __future__ import annotations

import re
from pathlib import Path
from collections import Counter, defaultdict


# =========================
# CONFIG
# =========================

RAW_TITLES_FILE = "raw_titles.txt"
ENTRIES_FILE = "entries.txt"          # your giant object list
DEDUPED_OUTPUT_FILE = "entries_deduped.txt"


# =========================
# NORMALIZATION
# =========================

def normalize_title(title: str) -> str:
    """
    Normalize titles so matching is less fragile.
    """
    if not title:
        return ""

    t = title.strip().lower()

    # Normalize curly apostrophes / quotes / dashes
    t = t.replace("’", "'").replace("‘", "'")
    t = t.replace("“", '"').replace("”", '"')
    t = t.replace("–", "-").replace("—", "-")

    # Common symbol normalization
    t = t.replace("&", " and ")

    # Remove stuff in parentheses like "(2024)" from raw list titles
    t = re.sub(r"\(\s*\d{4}\s*\)", "", t)

    # Remove punctuation except alphanumerics/spaces
    t = re.sub(r"[^a-z0-9\s]", " ", t)

    # Collapse whitespace
    t = re.sub(r"\s+", " ", t).strip()

    return t


# =========================
# RAW TITLES PARSER
# =========================

def parse_raw_titles(text: str) -> list[str]:
    """
    Parse the original raw title list.
    Works with lines like:
      - title
      * title
      title
    """
    titles = []

    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue

        # Remove bullets
        line = re.sub(r"^[\-\*\u2022]\s*", "", line).strip()
        if not line:
            continue

        # Skip section headers
        if line.lower() in {"shows:", "anime"}:
            continue

        titles.append(line)

    return titles


# =========================
# ENTRIES PARSER
# =========================

ENTRY_BLOCK_RE = re.compile(r"\{.*?\},?", re.DOTALL)
TITLE_RE = re.compile(r'title\s*:\s*"([^"]+)"')
ID_RE = re.compile(r'id\s*:\s*"([^"]+)"')


def parse_entries(text: str) -> list[dict]:
    """
    Parse JS-like object blocks and extract title/id/raw block.
    """
    entries = []

    for block in ENTRY_BLOCK_RE.findall(text):
        title_match = TITLE_RE.search(block)
        if not title_match:
            continue

        title = title_match.group(1).strip()

        id_match = ID_RE.search(block)
        entry_id = id_match.group(1).strip() if id_match else ""

        entries.append({
            "title": title,
            "id": entry_id,
            "normalized_title": normalize_title(title),
            "raw_block": block.strip(),
        })

    return entries


# =========================
# REPORTING
# =========================

def print_section(title: str):
    print("\n" + "=" * 80)
    print(title)
    print("=" * 80)


def build_duplicate_report(items: list[str]) -> dict[str, list[str]]:
    """
    For a list of original strings, group by normalized title.
    Return only duplicates.
    """
    groups = defaultdict(list)
    for item in items:
        groups[normalize_title(item)].append(item)

    return {
        norm: originals
        for norm, originals in groups.items()
        if norm and len(originals) > 1
    }


def build_entry_duplicate_report(entries: list[dict]) -> dict[str, list[dict]]:
    groups = defaultdict(list)
    for entry in entries:
        groups[entry["normalized_title"]].append(entry)

    return {
        norm: grouped
        for norm, grouped in groups.items()
        if norm and len(grouped) > 1
    }


def write_deduped_entries(entries: list[dict], output_path: str):
    """
    Keep first occurrence of each normalized title.
    """
    seen = set()
    kept_blocks = []

    for entry in entries:
        norm = entry["normalized_title"]
        if norm in seen:
            continue
        seen.add(norm)
        kept_blocks.append(entry["raw_block"].rstrip(","))

    final_text = ",\n\n".join(kept_blocks) + "\n"
    Path(output_path).write_text(final_text, encoding="utf-8")


# =========================
# MAIN
# =========================

def main():
    raw_titles_text = Path(RAW_TITLES_FILE).read_text(encoding="utf-8")
    entries_text = Path(ENTRIES_FILE).read_text(encoding="utf-8")

    raw_titles = parse_raw_titles(raw_titles_text)
    entries = parse_entries(entries_text)

    raw_title_dupes = build_duplicate_report(raw_titles)
    entry_dupes = build_entry_duplicate_report(entries)

    raw_norm_set = {normalize_title(t) for t in raw_titles if normalize_title(t)}
    entry_norm_set = {e["normalized_title"] for e in entries if e["normalized_title"]}

    missing_from_entries = sorted(raw_norm_set - entry_norm_set)
    extra_in_entries = sorted(entry_norm_set - raw_norm_set)

    norm_to_original_raw = defaultdict(list)
    for t in raw_titles:
        norm_to_original_raw[normalize_title(t)].append(t)

    norm_to_entry_titles = defaultdict(list)
    for e in entries:
        norm_to_entry_titles[e["normalized_title"]].append(e["title"])

    print_section("SUMMARY")
    print(f"Raw titles parsed: {len(raw_titles)}")
    print(f"Entries parsed: {len(entries)}")
    print(f"Unique raw titles (normalized): {len(raw_norm_set)}")
    print(f"Unique entry titles (normalized): {len(entry_norm_set)}")

    print_section("DUPLICATES IN RAW TITLE LIST")
    if not raw_title_dupes:
        print("None found.")
    else:
        for norm, originals in sorted(raw_title_dupes.items()):
            print(f"\nNormalized: {norm}")
            for item in originals:
                print(f"  - {item}")

    print_section("DUPLICATES IN GENERATED ENTRIES")
    if not entry_dupes:
        print("None found.")
    else:
        for norm, grouped in sorted(entry_dupes.items()):
            print(f"\nNormalized: {norm}")
            for entry in grouped:
                print(f'  - title="{entry["title"]}"  id="{entry["id"]}"')

    print_section("MISSING TITLES (IN RAW LIST BUT NO ENTRY FOUND)")
    if not missing_from_entries:
        print("None found.")
    else:
        for norm in missing_from_entries:
            originals = norm_to_original_raw.get(norm, [norm])
            print(f"- {originals[0]}")

    print_section("EXTRA ENTRIES (ENTRY EXISTS BUT NOT IN RAW TITLE LIST)")
    if not extra_in_entries:
        print("None found.")
    else:
        for norm in extra_in_entries:
            titles = norm_to_entry_titles.get(norm, [norm])
            print(f"- {titles[0]}")

    write_deduped_entries(entries, DEDUPED_OUTPUT_FILE)
    print_section("DONE")
    print(f"Deduped entries written to: {DEDUPED_OUTPUT_FILE}")


if __name__ == "__main__":
    main()