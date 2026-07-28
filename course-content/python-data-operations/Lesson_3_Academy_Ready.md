# Lesson 3 — Extract Products from HTML

## Lesson Builder settings

- **Type:** Mini Project
- **Language:** Python
- **Title:** Coding Test: Extract Products from HTML
- **Review required:** No

## Instructions

Create `extract_products(html)`, which reads an HTML string and returns product records in page order.

Each product is a `<div>` with class `product`. Extract:

- `name`: stripped text from `h2.name`
- `price`: text from `span.price`, without `$`, converted to float
- `in_stock`: `True` when the product div also has class `in-stock`

Use Python's standard-library `html.parser.HTMLParser`. This keeps the exercise fully runnable inside the Academy browser without installing external packages. Return an empty list when no product cards exist.

## Starter Code

```python
from html.parser import HTMLParser


class ProductParser(HTMLParser):
    def __init__(self):
        super().__init__()
        # Add the state needed while parsing.

    # Add your parser methods here.


def extract_products(html):
    """Extract product dictionaries from HTML text."""
    pass
```

## Test Case 1

**Description:** Extracts names, prices, and stock status in page order

**Test Code:**

```python
sample = """
<div class="product in-stock">
  <h2 class="name"> African Pear </h2>
  <span class="price">$3.50</span>
</div>
<div class="product">
  <h2 class="name">Soursop</h2>
  <span class="price">$5.00</span>
</div>
"""
expected = [
    {"name": "African Pear", "price": 3.5, "in_stock": True},
    {"name": "Soursop", "price": 5.0, "in_stock": False},
]
print(extract_products(sample) == expected)
```

**Expected Output:** `True`

## Test Case 2

**Description:** Ignores unrelated HTML and keeps price values as floats

**Test Code:**

```python
sample = """
<p>Featured products</p>
<div class="product in-stock featured">
  <h2 class="name">Guava</h2>
  <span class="price">$1.25</span>
</div>
"""
result = extract_products(sample)
print(
    result == [{"name": "Guava", "price": 1.25, "in_stock": True}]
    and isinstance(result[0]["price"], float)
)
```

**Expected Output:** `True`

## Test Case 3

**Description:** Returns an empty list when there are no product cards

**Test Code:**

```python
print(extract_products("<html><body><p>No products</p></body></html>") == [])
```

**Expected Output:** `True`

## Instructor Solution

```python
from html.parser import HTMLParser


class ProductParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.products = []
        self.current = None
        self.field = None

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        classes = attributes.get("class", "").split()
        if tag == "div" and "product" in classes:
            self.current = {"name": "", "price": "", "in_stock": "in-stock" in classes}
        elif self.current is not None and tag == "h2" and "name" in classes:
            self.field = "name"
        elif self.current is not None and tag == "span" and "price" in classes:
            self.field = "price"

    def handle_data(self, data):
        if self.current is not None and self.field:
            self.current[self.field] += data

    def handle_endtag(self, tag):
        if tag in ("h2", "span"):
            self.field = None
        elif tag == "div" and self.current is not None:
            self.products.append({
                "name": self.current["name"].strip(),
                "price": float(self.current["price"].strip().replace("$", "")),
                "in_stock": self.current["in_stock"],
            })
            self.current = None


def extract_products(html):
    parser = ProductParser()
    parser.feed(html)
    return parser.products
```

