QIntervals
==========

A JavaScript library allowing to store and manipulate lists of intervals.

  * [Official Repository (jshq/qintervals)](https://github.com/jshq/qintervals)
  * [Unlicense] (http://unlicense.org)

Introduction
------------

QIntervals is a library that can store and manipulate lists of intervals. It implements a data structure that can store an array of intervals in normalized form (sorted, non-intersecting, and non-ambiguous) and utility methods that can manipulate it. The library allows to perform a boolean algebra (and, or, xor, and subtraction) and various other operations like testing whether a value or an interval is in lists of intervals, and basic manipulation like shifting.

QIntervals has been designed to be friendly for JavaScript engines, especially V8, which powers Node. The list of intervals is stored as an array of numbers giving JS engine a chance to store the whole data in an unboxed continuous array to minimize the memory footprint. Utility functions to convert to/from internal representation are provided.

Documentation
-------------

QIntervals provides member-function based functionality and static-function based functionality. Member functions can be called on objects created by `qintervals` and static functions are available through `qintervals` itself. The design follows a rule that each member function should have a static function counterpart.

### Creating a list of intervals

To create an interval representation of a list of intervals use `qintervals()` or `qintervals.wrap()` functions.

```JS
// Create `qintervals` object from a list of packed intervals.
var a = qintervals([
  0, 1,
  2, 3
]);

// Create `qintervals` object from a list of objects having from/to.
var a = qintervals([
  { from: 0, to: 1 },
  { from: 2, to: 3 }
]);

// Create `qintervals` object from a list of objects having start/end.
var a = qintervals([
  { start: 0, end: 1 },
  { start: 2, end: 3 }
]);

// Create `qintervals` object from a list of objects having a/b.
var a = qintervals([
  { a: 0, b: 1 },
  { a: 2, b: 3 }
]);

// Create `qintervals` object from a list of objects having custom properties.
var a = qintervals([
  { x: 0, y: 1 },
  { x: 2, y: 3 }
], "x", "y");
```

To wrap an existing data into the `qintervals` object, consider using `qintervals.fromData()`:

```JS
// Create `qintervals` object based on a packed data. The engine will try to
// reuse the array if it's well-formed. This can be dangerous in cases that
// the input is modified while still being used by `qintervals` object.
var a = qintervals.fromData([0, 1, 2, 3]);
```

NOTE: QIntervals is designed in a way that all arguments always accept `qintervals` object or plain JavaScript array that is implicitly converted to `qintervals` for a given operation. You don't need to wrap all data you are using by `qintervals`, however, it's much faster to wrap each array that is used more than once as the library will normalize it only once and can omit normalization checks during processing.

### Data conversion

If you are done with `qintervals` it's possible to convert the data back to a preferred data format:

```JS
qintervals([1, 2, 5, 6]).getData();   // [1, 2, 5, 6] (weak).
qintervals([1, 2, 5, 6]).toPacked();  // [1, 2, 5, 6] (copy).
qintervals([1, 2, 5, 6]).toArrays();  // [[1, 2], [5, 6]].
qintervals([1, 2, 5, 6]).toObjects(); // [{ from: 1, to: 2}, { from: 5, to: 6}].
```

### Algebraic Operations

QIntervals library implements the following algebraic operations:

  * AND - Use `qintervals.and` or `qintervals.intersect`.
  * OR  - Use `qintervals.or`  or `qintervals.union`.
  * XOR - Use `qintervals.xor`.
  * SUB - Use `qintervals.sub` or `qintervals.subtract`.

Examples:

```JS
// Union (OR) two intervals.
var a = qintervals.or([1, 2], [5, 6]);  // [1, 2, 5, 6].
var a = qintervals([1, 2]).or([5, 6]);  // [1, 2, 5, 6].

// Intersect (AND) two intervals.
var a = qintervals.and([1, 6], [4, 8]); // [4, 6].
var a = qintervals([1, 6]).and([4, 8]); // [4, 6].

// XOR two intervals.
var a = qintervals.xor([1, 6], [4, 8]); // [1, 4, 6, 8].
var a = qintervals([1, 6]).xor([4, 8]); // [1, 4, 6, 8].

// Subtract one interval from another.
var a = qintervals.sub([1, 6], [4, 8]); // [1, 4].
var a = qintervals([1, 6]).sub([4, 8]); // [1, 4].
```

The number of intervals in a list is not limited:

```JS
var a = qintervals([1, 2, 10, 100, 1000, 5000]);
var b = qintervals([5, 6, 15, 200, 4000, 9999]);

qintervals.or(a, b);  // [1, 2, 5, 6, 10, 200, 1000, 9999].
qintervals.and(a, b); // [15, 100, 4000, 5000].
qintervals.xor(a, b); // [1, 2, 5, 6, 10, 15, 100, 200, 1000, 4000, 5000, 9999].
qintervals.sub(a, b); // [1, 2, 10, 15, 1000, 4000].
```

### Other Operations

Shifting allows to shift a list of intervals by a scalar value:

```JS
var a = qintervals([1, 2, 5, 6, 11, 12]);

a.shift(-5); // [-4, -3,  0,  1,  6,  7].
a.shift( 5); // [ 6,  7, 10, 11, 16, 17].
```

### Testing Operations

Testing enables to check whether a scalar value, an interval, or a list of intervals is contained in `qintervals` object. There are 3 possible results defined:

  * `qintervals.kTestNone` - No match - the tested value, interval, or intervals are not part of the `qintervals` object. 
  * `qintervals.kTestFull` - Full match - the tested value, interval, or list of intervals are fully contained in `qintervals` object. 
  * `qintervals.kTestPart` - Partial match - part of an interval or list of intervals are contained in `qintervals` object. 

```JS
var a = qintervals([1, 5, 10, 20, 50, 99]);
var b = qintervals([8, 20, 80, 100]);

// Scalar.
a.test(0);           // kTestFull.
a.test(4);           // kTestFull.
a.test(5);           // kTestNone (right side is not part of the interval).

// Interval.
a.test([1,  5]);     // kTestFull.
a.test([1, 99]);     // kTestPart (only partial match).

// List of intervals or `qintervals` instance.
a.test([0, 1, 6, 7); // kTestFull.
a.test(a);           // kTestFull.
a.test(b);           // kTestPart.
a.test([]);          // kTestNone (empty array always causes kTestNone).
```
