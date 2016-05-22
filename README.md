xspans
======

A container that allows to store and manipulate arrays of spans (or intervals).

  * [Official Repository (exjs/xspans)](https://github.com/exjs/xspans)
  * [Unlicense] (http://unlicense.org)

Introduction
------------

The library allows to store and manipulate arrays of spans (or intervals). It provides a data structure that can store an array of spans in a normalized form (sorted, non-intersecting, and coalesced) and static/member functions that can manipulate it. The library allows to perform a boolean algebra (and, or, xor, and subtraction) and various other operations like testing if a value or a span is in a span-array, and basic manipulation like offseting and scaling.

The library was designed to be friendly for JavaScript engines, especially V8, which powers node.js. The span-array is stored as an array of numbers giving JS engine a chance to store the whole data in an unboxed array. Utility functions to convert to or from internal representation are provided.

Documentation
-------------

The library provides member-function based functionality and static-function based functionality. Member functions can be called on objects created by `xspans` and static functions are available through `xspans` itself, which acts as a namespace in such case. The design follows a rule that member functions generally modify the `xspans` container itself whereas static functions always return a new `xspans` instance.

### Creating an xspans (span-array) object

To create a span-array representation of a span-array use `xspans()` or `xspans.wrap()` functions.

```js
// Create `xspans` object from an array of packed spans.
var a = xspans([0, 1, 2, 3]);

// Create `xspans` object from an array of arrays.
var a = xspans([[0, 1], [2, 3]]);

// Create `xspans` object from an array of objects having from/to.
var a = xspans([
  { from: 0, to: 1 },
  { from: 2, to: 3 }
]);

// Create `xspans` object from an array of objects having start/end.
var a = xspans([
  { start: 0, end: 1 },
  { start: 2, end: 3 }
]);

// Create `xspans` object from an array of objects having a/b.
var a = xspans([
  { a: 0, b: 1 },
  { a: 2, b: 3 }
]);

// Create `xspans` object from an array of objects having custom properties.
var a = xspans([
  { x: 0, y: 1 },
  { x: 2, y: 3 }
], "x", "y");
```

To wrap an existing data into the `xspans` object, consider using `xspans.fromData()`:

```js
// Create `xspans` object based on a packed data. The engine will try to
// reuse the array if it's well-formed. This can be dangerous in cases that
// the input is modified while still being used by `xspans` object.
var a = xspans.fromData([0, 1, 2, 3]);
```

NOTE: The library is designed in a way that all arguments always accept `xspans` object or plain JavaScript array that is implicitly converted to `xspans` for the given operation. You don't need to wrap all data you are using by `xspans`, however, it's much faster to wrap each array that is used more than once as the library will normalize it only once and can omit normalization checks during later processing.

### Data conversion

If you are done with `xspans` it's possible to convert the data back to a preferred data format:

```js
xspans([1, 2, 5, 6]).getData();           // [1, 2, 5, 6] (weak).
xspans([1, 2, 5, 6]).toPacked();          // [1, 2, 5, 6] (copy).
xspans([1, 2, 5, 6]).toArrays();          // [[1, 2], [5, 6]].
xspans([1, 2, 5, 6]).toObjects();         // [{ from: 1, to: 2 }, { from: 5, to: 6 }].
xspans([1, 2, 5, 6]).toObjects("a", "b"); // [{ a   : 1, b : 2 }, { a   : 5, b : 6 }].
```

### Algebraic Operations

The following algebraic operations are provided:

  * AND - Use `xspans.and` or `xspans.intersect`.
  * OR  - Use `xspans.or`  or `xspans.union`.
  * XOR - Use `xspans.xor`.
  * SUB - Use `xspans.sub` or `xspans.subtract`.

Examples:

```js
// Union (OR) two span arrays.
var a = xspans.or([1, 2], [5, 6]);  // [1, 2, 5, 6].
var a = xspans([1, 2]).or([5, 6]);  // [1, 2, 5, 6].

// Intersect (AND) two span arrays.
var a = xspans.and([1, 6], [4, 8]); // [4, 6].
var a = xspans([1, 6]).and([4, 8]); // [4, 6].

// XOR two span arrays.
var a = xspans.xor([1, 6], [4, 8]); // [1, 4, 6, 8].
var a = xspans([1, 6]).xor([4, 8]); // [1, 4, 6, 8].

// Subtract one span-array from another.
var a = xspans.sub([1, 6], [4, 8]); // [1, 4].
var a = xspans([1, 6]).sub([4, 8]); // [1, 4].
```

The number of spans in a span-array is not limited:

```js
var a = xspans([1, 2, 10, 100, 1000, 5000]);
var b = xspans([5, 6, 15, 200, 4000, 9999]);

xspans.or(a, b);  // [1, 2, 5, 6, 10, 200, 1000, 9999].
xspans.and(a, b); // [15, 100, 4000, 5000].
xspans.xor(a, b); // [1, 2, 5, 6, 10, 15, 100, 200, 1000, 4000, 5000, 9999].
xspans.sub(a, b); // [1, 2, 10, 15, 1000, 4000].
```

### Other Operations

Shifting allows to shift a span-array by a scalar value:

```js
var a = xspans([1, 2, 5, 6, 11, 12]);
a.shift(-5); // [-4, -3,  0,  1,  6,  7].
a.shift( 5); // [ 6,  7, 10, 11, 16, 17].
```

Scaling allows to scale by a scalar value (only positive scale is allowed):

```js
var a = xspans([1, 2, 5, 6, 11, 12]);
a.scale(2); // [2, 4, 10, 12, 22, 24].
```

### Testing Operations

Testing enables to check whether a scalar value, an array, or a span-array is contained in `xspans` object. There are 3 possible results defined:

  * `xspans.kTestNone` - No match - the tested value, array, or `xspans` are not part of the `xspans` object.
  * `xspans.kTestFull` - Full match - the tested value, array, or `xspans` are fully contained in `xspans` object.
  * `xspans.kTestPart` - Partial match - part of an span or `xspans` are contained in `xspans` object.

```js
var a = xspans([1, 5, 10, 20, 50, 99]);
var b = xspans([8, 20, 80, 100]);

// Scalar.
a.test(0);           // kTestFull.
a.test(4);           // kTestFull.
a.test(5);           // kTestNone (right side is not part of the span).

// Interval.
a.test([1,  5]);     // kTestFull.
a.test([1, 99]);     // kTestPart (only partial match).

// Span-array or `xspans` instance.
a.test([0, 1, 6, 7); // kTestFull.
a.test(a);           // kTestFull.
a.test(b);           // kTestPart.
a.test([]);          // kTestNone (empty array always causes kTestNone).
```
