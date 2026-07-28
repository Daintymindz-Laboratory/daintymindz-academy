# Lesson 4 — Clean Messy Records

## Lesson Builder settings

- **Type:** Mini Project
- **Language:** Python
- **Title:** Coding Test: Clean and Deduplicate Records
- **Review required:** No

## Instructions

Implement `clean_records(records)`. For every input dictionary:

1. Read missing fields with `row.get(key, "")`.
2. Convert `id` to a stripped string. Drop the row if the ID is empty.
3. Convert `fruit` to a stripped string.
4. Convert `category` to a stripped, lowercase string.
5. Convert `weight_g` to a float. Use `None` when conversion fails.
6. Remove exact duplicate cleaned records, keeping the first occurrence.

Each result must contain exactly `id`, `fruit`, `category`, and `weight_g`, and the order of retained records must not change. Deduplicate using all four cleaned values—not the ID alone.

## Starter Code

```python
def clean_records(records):
    """Clean, validate, and deduplicate raw record dictionaries."""
    cleaned = []
    seen = set()

    # Write your solution here.

    return cleaned
```

## Test Case 1

**Description:** Cleans fields, drops missing IDs, and removes exact duplicates

**Test Code:**

```python
records = [
    {"id": " 1 ", "fruit": " Guava ", "category": "TROPICAL", "weight_g": "150"},
    {"id": "1", "fruit": "Guava", "category": "tropical", "weight_g": "150"},
    {"id": "2", "fruit": "Pawpaw", "category": "Tropical", "weight_g": "n/a"},
    {"fruit": "NoId", "category": "x", "weight_g": "10"},
]
expected = [
    {"id": "1", "fruit": "Guava", "category": "tropical", "weight_g": 150.0},
    {"id": "2", "fruit": "Pawpaw", "category": "tropical", "weight_g": None},
]
print(clean_records(records) == expected)
```

**Expected Output:** `True`

## Test Case 2

**Description:** Keeps records with the same ID when other cleaned values differ

**Test Code:**

```python
records = [
    {"id": 7, "fruit": "Pear", "category": "Fresh", "weight_g": "100"},
    {"id": 7, "fruit": "Pear", "category": "Fresh", "weight_g": "120"},
]
result = clean_records(records)
print(len(result) == 2 and result[0]["id"] == "7" and result[1]["weight_g"] == 120.0)
```

**Expected Output:** `True`

## Test Case 3

**Description:** Handles empty input

**Test Code:**

```python
print(clean_records([]) == [])
```

**Expected Output:** `True`

## Instructor Solution

```python
def clean_records(records):
    cleaned = []
    seen = set()
    for row in records:
        record_id = str(row.get("id", "")).strip()
        if not record_id:
            continue
        fruit = str(row.get("fruit", "")).strip()
        category = str(row.get("category", "")).strip().lower()
        try:
            weight = float(str(row.get("weight_g", "")).strip())
        except (TypeError, ValueError):
            weight = None

        record = {
            "id": record_id,
            "fruit": fruit,
            "category": category,
            "weight_g": weight,
        }
        key = (record_id, fruit, category, weight)
        if key not in seen:
            seen.add(key)
            cleaned.append(record)
    return cleaned
```

