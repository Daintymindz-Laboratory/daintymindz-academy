# Lesson 6 — Build and Validate a Dataset Manifest

## Lesson Builder settings

- **Type:** Mini Project
- **Language:** Python
- **Title:** Coding Test: Build a Dataset Manifest
- **Review required:** No

## Instructions

Implement `build_manifest(files, allowed_labels, allowed_splits)`.

Validate each file record in order. Apply these rules in this exact priority and stop checking a record after its first failure:

1. Missing or empty filename → `"missing filename"`
2. Filename already accepted → `"duplicate filename: {name}"`
3. Disallowed label → `"bad label for {name}: {label}"`
4. Disallowed split → `"bad split for {name}: {split}"`
5. Otherwise accept and count the record

Only accepted filenames count as seen. Read fields with `.get(..., "")`.

Return exactly:

```python
{
    "num_files": 0,
    "by_split": {},
    "by_label": {},
    "errors": [],
}
```

Counts must include valid records only, and errors must remain in discovery order.

## Starter Code

```python
def build_manifest(files, allowed_labels, allowed_splits):
    """Validate file records and return manifest counts and errors."""
    manifest = {
        "num_files": 0,
        "by_split": {},
        "by_label": {},
        "errors": [],
    }
    accepted_filenames = set()

    # Write your solution here.

    return manifest
```

## Test Case 1

**Description:** Counts valid files and reports validation errors in priority order

**Test Code:**

```python
files = [
    {"filename": "a.jpg", "label": "fresh", "split": "train"},
    {"filename": "b.jpg", "label": "spoiled", "split": "train"},
    {"filename": "a.jpg", "label": "fresh", "split": "test"},
    {"filename": "c.jpg", "label": "unknown", "split": "train"},
    {"filename": "d.jpg", "label": "fresh", "split": "holdout"},
]
expected = {
    "num_files": 2,
    "by_split": {"train": 2},
    "by_label": {"fresh": 1, "spoiled": 1},
    "errors": [
        "duplicate filename: a.jpg",
        "bad label for c.jpg: unknown",
        "bad split for d.jpg: holdout",
    ],
}
print(build_manifest(files, {"fresh", "spoiled"}, {"train", "test", "val"}) == expected)
```

**Expected Output:** `True`

## Test Case 2

**Description:** Reports missing filename before label or split errors

**Test Code:**

```python
result = build_manifest(
    [{"label": "unknown", "split": "holdout"}],
    {"fresh"},
    {"train"},
)
print(result["num_files"] == 0 and result["errors"] == ["missing filename"])
```

**Expected Output:** `True`

## Test Case 3

**Description:** Builds correct counts when all records are valid

**Test Code:**

```python
files = [
    {"filename": "x.jpg", "label": "fresh", "split": "train"},
    {"filename": "y.jpg", "label": "fresh", "split": "val"},
]
expected = {
    "num_files": 2,
    "by_split": {"train": 1, "val": 1},
    "by_label": {"fresh": 2},
    "errors": [],
}
print(build_manifest(files, {"fresh"}, {"train", "val"}) == expected)
```

**Expected Output:** `True`

## Instructor Solution

```python
def build_manifest(files, allowed_labels, allowed_splits):
    manifest = {
        "num_files": 0,
        "by_split": {},
        "by_label": {},
        "errors": [],
    }
    accepted_filenames = set()

    for file_record in files:
        name = file_record.get("filename", "")
        label = file_record.get("label", "")
        split = file_record.get("split", "")

        if not name:
            manifest["errors"].append("missing filename")
            continue
        if name in accepted_filenames:
            manifest["errors"].append(f"duplicate filename: {name}")
            continue
        if label not in allowed_labels:
            manifest["errors"].append(f"bad label for {name}: {label}")
            continue
        if split not in allowed_splits:
            manifest["errors"].append(f"bad split for {name}: {split}")
            continue

        accepted_filenames.add(name)
        manifest["num_files"] += 1
        manifest["by_split"][split] = manifest["by_split"].get(split, 0) + 1
        manifest["by_label"][label] = manifest["by_label"].get(label, 0) + 1

    return manifest
```

