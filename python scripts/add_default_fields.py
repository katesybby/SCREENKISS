from pathlib import Path

INPUT_FILE = Path("data.js")
OUTPUT_FILE = Path("data.with_defaults.js")


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


def has_field(obj: str, field_name: str) -> bool:
    return f"{field_name}:" in obj


def insert_missing_fields(obj: str) -> str:
    lines = obj.splitlines()

    if has_field(obj, "classic") and has_field(obj, "nostalgic") and has_field(obj, "filterTags"):
        return obj

    # figure out indentation from first property line
    indent = "    "
    for line in lines:
        stripped = line.strip()
        if stripped and ":" in stripped and not stripped.startswith("{") and not stripped.startswith("}"):
            indent = line[:len(line) - len(line.lstrip())]
            break

    fields_to_add = []
    if not has_field(obj, "classic"):
        fields_to_add.append(f'{indent}classic: false,')
    if not has_field(obj, "nostalgic"):
        fields_to_add.append(f'{indent}nostalgic: false,')
    if not has_field(obj, "filterTags"):
        fields_to_add.append(f'{indent}filterTags: [],')

    if not fields_to_add:
        return obj

    # place them before featured if possible, otherwise before watched, otherwise before closing brace
    insert_index = None
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith("featured:"):
            insert_index = i
            break

    if insert_index is None:
        for i, line in enumerate(lines):
            stripped = line.strip()
            if stripped.startswith("watched:"):
                insert_index = i
                break

    if insert_index is None:
        for i in range(len(lines) - 1, -1, -1):
            if lines[i].strip() == "}":
                insert_index = i
                break

    new_lines = lines[:insert_index] + fields_to_add + lines[insert_index:]
    return "\n".join(new_lines)


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
    updated_objects = [insert_missing_fields(obj) for obj in objects]

    final = prefix + "\n" + ",\n".join(updated_objects) + "\n" + suffix
    OUTPUT_FILE.write_text(final, encoding="utf-8")

    print(f"Done. Wrote {OUTPUT_FILE}")


if __name__ == "__main__":
    main()