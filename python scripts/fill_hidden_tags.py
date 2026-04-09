from pathlib import Path
import re

INPUT_FILE = Path("data.js")
OUTPUT_FILE = Path("data.with_tags.js")

FILTER_ORDER = [
    "dark",
    "funny",
    "love",
    "scary",
    "tense",
    "mindfuck",
    "girly",
    "gay",
    "period",
    "crime",
    "magic",
    "space",
    "coming-of-age",
    "classic",
    "nostalgia",
    "light",
]

NOSTALGIA_TITLE_HINTS = {
    "wild child",
    "she’s the man",
    "she's the man",
    "monte carlo",
    "aquamarine",
    "mean girls",
    "jennifer’s body",
    "jennifer's body",
    "sleepover",
    "what a girl wants",
    "the clique",
    "easy a",
    "john tucker must die",
    "bring it on",
    "legally blonde",
    "confessions of a teenage drama queen",
    "a cinderella story",
    "princess diaries",
    "freaky friday",
}

CLASSIC_TITLE_HINTS = {
    "cleopatra",
    "the seventh seal",
    "schindler's list",
    "schindlers list",
    "gentlemen prefer blondes",
    "a clockwork orange",
    "edward scissorhands",
    "once upon a time in america",
    "persona",
    "breathless",
    "the red shoes",
}

def split_top_level_objects(array_text: str):
    objects = []
    depth = 0
    in_string = False
    escape = False
    quote_char = None
    start = None

    for i, ch in enumerate(array_text):
        if in_string:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == quote_char:
                in_string = False
                quote_char = None
            continue

        if ch in ('"', "'"):
            in_string = True
            quote_char = ch
            continue

        if ch == "{":
            if depth == 0:
                start = i
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0 and start is not None:
                objects.append(array_text[start:i+1])

    return objects

def slugify(text: str) -> str:
    text = text.lower().replace("’", "'")
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")

def extract_string(field: str, obj: str):
    m = re.search(rf'{field}:\s*"((?:[^"\\]|\\.)*)"', obj)
    return m.group(1) if m else None

def extract_number(field: str, obj: str):
    m = re.search(rf"{field}:\s*([0-9]+(?:\.[0-9]+)?)", obj)
    return float(m.group(1)) if m else None

def extract_array_of_strings(field: str, obj: str):
    m = re.search(rf"{field}:\s*\[(.*?)\]", obj, re.S)
    if not m:
        return []
    inner = m.group(1).strip()
    if not inner:
        return []
    return re.findall(r'"((?:[^"\\]|\\.)*)"', inner)

def ordered_unique(tags):
    seen = set()
    result = []
    for tag in FILTER_ORDER:
        if tag in tags and tag not in seen:
            result.append(tag)
            seen.add(tag)
    return result

def compute_classic(title, year, vibe, hint):
    text = " ".join([title or "", vibe or "", hint or ""]).lower()
    title_slug = slugify(title or "")

    if title_slug in {slugify(x) for x in CLASSIC_TITLE_HINTS}:
        return True

    if year is not None and int(year) <= 1985:
        return True

    if any(x in text for x in [
        "classic hollywood", "french new wave", "criterion",
        "silent era", "bergman", "golden age"
    ]):
        return True

    return False

def compute_nostalgic(title, year, vibe, hint, adjectives):
    text = " ".join([title or "", vibe or "", hint or "", " ".join(adjectives or [])]).lower()
    title_slug = slugify(title or "")

    if title_slug in {slugify(x) for x in NOSTALGIA_TITLE_HINTS}:
        return True

    if year is not None and 2004 <= int(year) <= 2016:
        if any(x in text for x in [
            "teen", "high school", "sleepover", "iconic",
            "coming-of-age", "cute", "romcom", "chaotic"
        ]):
            return True

    return False

def compute_filter_tags(title, media_type, year, vibe, intensity, adjectives, hint, classic, nostalgic):
    text = " ".join([
        title or "",
        vibe or "",
        intensity or "",
        hint or "",
        " ".join(adjectives or [])
    ]).lower()

    tags = set()

    if classic:
        tags.add("classic")
    if nostalgic:
        tags.add("nostalgia")

    if intensity == "glossy":
        tags.add("light")

    if intensity in {"messy", "unwell"}:
        tags.add("dark")

    if any(x in text for x in [
        "comedy", "funny", "satire", "campy", "silly", "petty", "goofy"
    ]):
        tags.add("funny")

    if any(x in text for x in [
        "romance", "love", "longing", "relationship", "affair", "desire"
    ]):
        tags.add("love")

    if any(x in text for x in [
        "horror", "haunted", "ghost", "slasher", "demon", "possession",
        "monster", "body horror"
    ]):
        tags.update({"scary", "dark"})

    if any(x in text for x in [
        "thriller", "tense", "suspense", "panic", "revenge",
        "paranoia", "stress", "cat-and-mouse"
    ]):
        tags.add("tense")

    if any(x in text for x in [
        "psychological", "surreal", "twist", "dream", "hallucination",
        "time loop", "identity", "alternate reality", "mind-bending",
        "existential", "brain"
    ]):
        tags.update({"mindfuck", "dark"})

    if any(x in text for x in [
        "feminine", "girlhood", "women", "woman", "beauty", "girly",
        "female-led", "dark feminine"
    ]):
        tags.add("girly")

    if any(x in text for x in [
        "queer", "wlw", "lesbian", "gay", "yuri", "two women", "sapphic"
    ]):
        tags.add("gay")

    if any(x in text for x in [
        "period", "historical", "victorian", "royal", "queen", "court",
        "wwii", "19th century", "18th century", "costume drama"
    ]):
        tags.add("period")

    if any(x in text for x in [
        "crime", "heist", "mob", "mafia", "detective", "murder", "gangster", "drug"
    ]):
        tags.add("crime")

    if any(x in text for x in [
        "witch", "fantasy", "magic", "myth", "fairy", "spell", "supernatural"
    ]):
        tags.add("magic")

    if any(x in text for x in [
        "space", "sci-fi", "future", "dystopia", "alien", "android",
        "robot", "multiverse", "cyberpunk"
    ]):
        tags.add("space")

    if any(x in text for x in [
        "coming-of-age", "teen", "high school", "boarding school",
        "youth", "growing up"
    ]):
        tags.add("coming-of-age")

    return ordered_unique(tags)

def replace_field(obj: str, field_name: str, value_code: str) -> str:
    pattern = rf"^(\s*){re.escape(field_name)}:\s*.*?,\s*$"
    replacement = rf"\1{field_name}: {value_code},"
    return re.sub(pattern, replacement, obj, flags=re.M)

def format_string_array(values):
    return "[" + ", ".join(f'"{v}"' for v in values) + "]"

def main():
    text = INPUT_FILE.read_text(encoding="utf-8")

    array_start = text.find("[")
    array_end = text.rfind("]")

    if array_start == -1 or array_end == -1:
        raise ValueError("Could not find WATCHLIST array in data.js")

    prefix = text[:array_start + 1]
    array_body = text[array_start + 1:array_end]
    suffix = text[array_end:]

    objects = split_top_level_objects(array_body)
    updated_objects = []

    for obj in objects:
        title = extract_string("title", obj)
        media_type = extract_string("type", obj)
        year = extract_number("year", obj)
        vibe = extract_string("vibe", obj)
        intensity = extract_string("intensity", obj)
        hint = extract_string("hint", obj)
        adjectives = extract_array_of_strings("adjectives", obj)

        classic = compute_classic(title, year, vibe, hint)
        nostalgic = compute_nostalgic(title, year, vibe, hint, adjectives)
        filter_tags = compute_filter_tags(
            title=title,
            media_type=media_type,
            year=year,
            vibe=vibe,
            intensity=intensity,
            adjectives=adjectives,
            hint=hint,
            classic=classic,
            nostalgic=nostalgic,
        )

        obj = replace_field(obj, "classic", "true" if classic else "false")
        obj = replace_field(obj, "nostalgic", "true" if nostalgic else "false")
        obj = replace_field(obj, "filterTags", format_string_array(filter_tags))

        updated_objects.append(obj)

    final = prefix + "\n" + ",\n".join(updated_objects) + "\n" + suffix
    OUTPUT_FILE.write_text(final, encoding="utf-8")

    print(f"Done. Wrote {OUTPUT_FILE}")

if __name__ == "__main__":
    main()