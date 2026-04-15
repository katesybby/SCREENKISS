import re
from pathlib import Path

FILE = Path("data.js")

def normalize(title):
    return re.sub(r"[^a-z0-9]", "", title.lower())

def extract_titles(text):
    matches = re.findall(r'title:\s*"([^"]+)"', text)
    years = re.findall(r'year:\s*([0-9]{4})', text)

    items = []
    for i in range(min(len(matches), len(years))):
        items.append((matches[i], years[i]))

    return items

def main():
    text = FILE.read_text(encoding="utf-8")
    items = extract_titles(text)

    seen = {}
    duplicates = []

    for title, year in items:
        key = f"{normalize(title)}-{year}"
        if key in seen:
            duplicates.append((title, year))
        else:
            seen[key] = True

    if duplicates:
        print("🚨 DUPLICATES FOUND:")
        for t, y in duplicates:
            print(f"{t} ({y})")
    else:
        print("No duplicates found ✅")

if __name__ == "__main__":
    main()