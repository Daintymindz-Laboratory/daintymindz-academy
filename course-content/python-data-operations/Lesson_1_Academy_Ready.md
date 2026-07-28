# Lesson 1 — Parse a Fruit CSV

## Lesson Builder settings

- **Type:** Mini Project
- **Language:** Python
- **Title:** Coding Test: Parse a Fruit CSV
- **Review required:** No

## Instructions

Create `parse_fruit_csv(csv_text)`, a function that converts CSV text into clean Python records.

The CSV header is always `fruit,quantity,price`. Return one dictionary per data row, in the original order:

- `fruit`: stripped string
- `quantity`: integer
- `price`: float

Use Python's `csv` module and `io.StringIO`; do not split rows manually. An input containing only the header must return an empty list.

## Starter Code

```python
import csv
import io


def parse_fruit_csv(csv_text):
    """Return clean, typed fruit records from CSV text."""
    # Write your solution here.
    pass
```

## Test Case 1

**Description:** Parses multiple rows, strips whitespace, and converts types

**Test Code:**

```python
sample = "fruit,quantity,price\n African Pear , 12 , 3.50\nGuava,5,1.25\n"
expected = [
    {"fruit": "African Pear", "quantity": 12, "price": 3.5},
    {"fruit": "Guava", "quantity": 5, "price": 1.25},
]
print(parse_fruit_csv(sample) == expected)
```

**Expected Output:** `True`

## Test Case 2

**Description:** Returns genuine integer and float values

**Test Code:**

```python
result = parse_fruit_csv("fruit,quantity,price\nSoursop,3,4.00\n")
print(
    len(result) == 1
    and isinstance(result[0]["quantity"], int)
    and isinstance(result[0]["price"], float)
)
```

**Expected Output:** `True`

## Test Case 3

**Description:** Handles a CSV containing only the header

**Test Code:**

```python
print(parse_fruit_csv("fruit,quantity,price\n") == [])
```

**Expected Output:** `True`

## Instructor Solution

```python
import csv
import io


def parse_fruit_csv(csv_text):
    reader = csv.DictReader(io.StringIO(csv_text))
    return [
        {
            "fruit": row["fruit"].strip(),
            "quantity": int(row["quantity"].strip()),
            "price": float(row["price"].strip()),
        }
        for row in reader
    ]
```

