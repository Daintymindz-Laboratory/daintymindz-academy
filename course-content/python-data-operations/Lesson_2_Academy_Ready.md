# Lesson 2 — Flatten Records and Create JSONL

## Lesson Builder settings

- **Type:** Mini Project
- **Language:** Python
- **Title:** Coding Test: Flatten Records into JSONL
- **Review required:** No

## Instructions

Implement two functions:

1. `flatten_record(record)` flattens one level of nested dictionaries using dotted keys.
2. `to_jsonl(records)` returns one flattened JSON object per line.

Example: `{"id": 1, "meta": {"source": "field"}}` becomes `{"id": 1, "meta.source": "field"}`.

Keep non-dictionary values unchanged. Serialize each line with `json.dumps(..., sort_keys=True)`, join lines with `"\n"`, and do not add a trailing newline. An empty list must return an empty string.

## Starter Code

```python
import json


def flatten_record(record):
    """Flatten one level of nested dictionaries using dotted keys."""
    pass


def to_jsonl(records):
    """Return flattened records as a deterministic JSONL string."""
    pass
```

## Test Case 1

**Description:** Flattens nested dictionaries and produces valid JSONL

**Test Code:**

```python
records = [
    {"id": 1, "meta": {"source": "field", "ok": True}},
    {"id": 2, "meta": {"source": "web"}},
]
lines = to_jsonl(records).split("\n")
actual = [json.loads(line) for line in lines]
expected = [
    {"id": 1, "meta.source": "field", "meta.ok": True},
    {"id": 2, "meta.source": "web"},
]
print(actual == expected)
```

**Expected Output:** `True`

## Test Case 2

**Description:** Preserves list and numeric values and adds no trailing newline

**Test Code:**

```python
output = to_jsonl([{"tags": ["ripe", "green"], "n": 3}])
print(
    not output.endswith("\n")
    and json.loads(output) == {"tags": ["ripe", "green"], "n": 3}
)
```

**Expected Output:** `True`

## Test Case 3

**Description:** Handles an empty record list

**Test Code:**

```python
print(to_jsonl([]) == "")
```

**Expected Output:** `True`

## Instructor Solution

```python
import json


def flatten_record(record):
    flat = {}
    for key, value in record.items():
        if isinstance(value, dict):
            for nested_key, nested_value in value.items():
                flat[f"{key}.{nested_key}"] = nested_value
        else:
            flat[key] = value
    return flat


def to_jsonl(records):
    return "\n".join(
        json.dumps(flatten_record(record), sort_keys=True)
        for record in records
    )
```

