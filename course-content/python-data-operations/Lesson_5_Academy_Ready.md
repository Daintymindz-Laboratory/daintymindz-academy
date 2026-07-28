# Lesson 5 — Convert Bounding Boxes to YOLO

## Lesson Builder settings

- **Type:** Mini Project
- **Language:** Python
- **Title:** Coding Test: Convert Annotations to YOLO
- **Review required:** No

## Instructions

Implement `to_yolo(annotations, class_map)`.

Each annotation contains a label, image width and height, and a pixel bounding box:

```python
{"label": "pear", "img_w": 100, "img_h": 100, "bbox": [xmin, ymin, xmax, ymax]}
```

For every annotation, calculate:

- `x_center = (xmin + xmax) / 2 / img_w`
- `y_center = (ymin + ymax) / 2 / img_h`
- `width = (xmax - xmin) / img_w`
- `height = (ymax - ymin) / img_h`

Return one line per annotation in its original order:

`class_id x_center y_center width height`

Format every coordinate with exactly six decimal places. Join lines with `"\n"` and do not add a trailing newline. Empty input must return an empty string.

## Starter Code

```python
def to_yolo(annotations, class_map):
    """Convert pixel bounding boxes to YOLO text format."""
    lines = []

    # Write your solution here.

    return "\n".join(lines)
```

## Test Case 1

**Description:** Converts one square-image bounding box correctly

**Test Code:**

```python
annotations = [
    {"label": "pear", "img_w": 100, "img_h": 100, "bbox": [10, 20, 30, 60]},
]
expected = "0 0.200000 0.400000 0.200000 0.400000"
print(to_yolo(annotations, {"pear": 0, "guava": 1}) == expected)
```

**Expected Output:** `True`

## Test Case 2

**Description:** Uses the correct dimensions and class IDs for multiple boxes

**Test Code:**

```python
annotations = [
    {"label": "pear", "img_w": 200, "img_h": 100, "bbox": [0, 0, 100, 50]},
    {"label": "guava", "img_w": 200, "img_h": 100, "bbox": [100, 50, 200, 100]},
]
expected = (
    "0 0.250000 0.250000 0.500000 0.500000\n"
    "1 0.750000 0.750000 0.500000 0.500000"
)
print(to_yolo(annotations, {"pear": 0, "guava": 1}) == expected)
```

**Expected Output:** `True`

## Test Case 3

**Description:** Handles empty input without adding a newline

**Test Code:**

```python
output = to_yolo([], {"pear": 0})
print(output == "" and not output.endswith("\n"))
```

**Expected Output:** `True`

## Instructor Solution

```python
def to_yolo(annotations, class_map):
    lines = []
    for annotation in annotations:
        class_id = class_map[annotation["label"]]
        image_width = annotation["img_w"]
        image_height = annotation["img_h"]
        xmin, ymin, xmax, ymax = annotation["bbox"]

        x_center = (xmin + xmax) / 2 / image_width
        y_center = (ymin + ymax) / 2 / image_height
        width = (xmax - xmin) / image_width
        height = (ymax - ymin) / image_height

        lines.append(
            f"{class_id} {x_center:.6f} {y_center:.6f} "
            f"{width:.6f} {height:.6f}"
        )
    return "\n".join(lines)
```

