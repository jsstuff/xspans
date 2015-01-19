// QIntervals <https://github.com/jshq/qintervals>
(function($export, $as) {
"use strict";

var isArray = Array.isArray;
var hasOwnProperty = Object.prototype.hasOwnProperty;

var kTestNone = 0;
var kTestFull = 1;
var kTestPart = 2;

// \function `qintervals(arg)`
//
// Preferred constructor to create a new `qintervals` instance based on `arg`,
// which can be a list of packed intervals or objects.
//
// If no argument is provided an empty instance of `qintervals` is returned.
function qintervals(arg, aKey, bKey) {
  var data = null;

  if (!(this instanceof qintervals))
    return new qintervals(arg, aKey, bKey);

  if (!arg)
    data = [];
  else if (arg instanceof qintervals)
    data = arg.data.slice(0, arg.data.length);
  else
    data = dataFromArg(arg, aKey, bKey);

  this.data = data;
}

// \def `qintervals.VERSION`
//
// Version string of `qintervals` library as "major.minor.patch".
qintervals.VERSION = "0.2.0";

// \def `qintervals.kTestNone`
//
// A testing value of an interval didn't hit the list of intervals.
qintervals.kTestNone = kTestNone;

// \def `qintervals.kTestFull`
//
// A testing value of an interval fully hits the list of intervals.
qintervals.kTestFull = kTestFull;

// \def `qintervals.kTestPart`
//
// A testing value of an interval partially hits the list of intervals.
qintervals.kTestPart = kTestPart;

// \internal
//
// Autodetect a property contained in `obj` based on the property `list`.
function detectKey(obj, list) {
  for (var i = 0, len = list.length; i < len; i++) {
    var key = list[i];

    if (hasOwnProperty.call(obj, key))
      return key;
  }

  throw new Error("Object doesn't contain known property.");
}
var DetectFrom = ["from", "start", "a"];
var DetectTo   = ["to"  , "end"  , "b"];

// \internal
//
// Equality check.
function equals(a, b) {
  var aLen = a.length;
  var bLen = b.length;

  if (aLen !== bLen)
    return false;

  for (var i = 0; i < aLen; i++) {
    if (a[i] !== b[i])
      return false;
  }

  return true;
}

// \internal
//
// Get whether `data` is a well-formed list of intervals
//
// Well format means:
//
//   - Intervals are sorted.
//   - Intervals don't intersect.
//   - Intervals are incontinuous, i.e. [1, 3] instead of [1, 2, 2, 3].
function isWellFormed(data) {
  var len = data.length;
  if (len === 0)
    return true;

  var last = data[1];
  if (data[0] >= last)
    return false;

  for (var i = 2; i < len; i += 2) {
    var x = data[i];
    var y = data[i + 1];

    if (typeof x !== "number" || typeof y !== "number")
      return false;

    if (last >= x || x >= y)
      return false;

    last = y;
  }

  return true;
}

// \internal
//
// Get well-formed data.
//
// Returns an array of well-formed data that can be same as `data` passed in
// case that intervals inside are sorted, don't intersect, and are coalesced.
function asWellFormed(data) {
  if (isWellFormed(data))
    return data;

  var i;
  var len = data.length;

  var a = 0.0;
  var b = 0.0;
  var t = 0.0;
  var last = -Number.MAX_VALUE;

  var arrays = null;
  var output = [];

  for (i = 0; i < len; i += 2) {
    a = data[i];
    b = data[i + 1];

    if (typeof a !== "number") throw new TypeError("Expected Number, got " + typeof a + ".");
    if (typeof b !== "number") throw new TypeError("Expected Number, got " + typeof b + ".");

    if (a >= b) {
      if (a === b)
        continue;

      t = a;
      a = b;
      b = t;
    }

    // Append/Merge into the last interval of `output`.
    if (a >= last) {
      if (a === last && output.length !== 0)
        output[output.length - 1] = b;
      else
        output.push(a, b);

      last = b;
      continue;
    }
    // Prepend/Merge into the first interval of `output`.
    else {
      t = output[0];
      if (t >= b) {
        if (t === b)
          output[0] = a;
        else
          output.unshift(a, b);
        continue;
      }
    }

    if (!arrays)
      arrays = [];

    arrays.push(output);
    output = [a, b];
    last = b;
  }

  if (!arrays)
    return output;

  if (output.length)
    arrays.push(output);

  return mergeArrays(arrays);
}

// \internal
//
// Get well-formed data based on data containing interval objects.
function asWellFormedFromObjects(data, aKey, bKey) {
  var len = data.length;
  if (!len)
    return [];

  var a = 0.0;
  var b = 0.0;
  var t = 0.0;
  var last = -Number.MAX_VALUE;

  var arrays = null;
  var output = [];

  if (!aKey) aKey = DetectFrom[0];
  if (!bKey) bKey = DetectTo[0];

  for (var i = 0; i < len; i++) {
    var obj = data[i];

    if (!hasOwnProperty.call(obj, aKey)) aKey = detectKey(obj, DetectFrom);
    if (!hasOwnProperty.call(obj, bKey)) bKey = detectKey(obj, DetectTo);

    a = obj[aKey];
    b = obj[bKey];

    if (typeof a !== "number") throw new TypeError("Expected Number, got " + typeof a + ".");
    if (typeof b !== "number") throw new TypeError("Expected Number, got " + typeof b + ".");

    if (a >= b) {
      if (a === b)
        continue;

      t = a;
      a = b;
      b = t;
    }

    // Append/Merge into the last interval of `output`.
    if (a >= last) {
      if (a === last && output.length !== 0)
        output[output.length - 1] = b;
      else
        output.push(a, b);

      last = b;
      continue;
    }
    // Prepend/Merge into the first interval of `output`.
    else {
      t = output[0];
      if (t >= b) {
        if (t === b)
          output[0] = a;
        else
          output.unshift(a, b);
        continue;
      }
    }

    if (!arrays)
      arrays = [];

    arrays.push(output);
    output = [a, b];
    last = b;
  }

  if (!arrays)
    return output;

  if (output.length)
    arrays.push(output);

  return mergeArrays(arrays);
}

// \function `qintervals.wrap(data)`
//
// Return `qintervals` object reusing/wrapping an existing array of packed intervals.
//
// NOTE: This is a low-level function that just wraps a given `array` to be used
// by `qintervals` object, it doesn't copy the values if they are well format
// (sorted, coalesced, and non-intersecting).
function wrap(data) {
  return new qintervals(asWellFormed(data));
}
qintervals.wrap = wrap;

// \internal
//
// Incrementally merge (union operation) multiple arrays passed in `arrays`.
// Returns a single array containing all intervals merged and coalesced.
function mergeArrays(arrays) {
  var len = arrays.length;

  // Handle the corner cases first that import functions shouldn't really
  // produce as `multimerge()` is only called internally, it's not exported.
  if (len === 0) return arrays;
  if (len === 1) return arrays[0];

  var i = 1;
  var a = arrays[0];

  while (i < len) {
    var b = arrays[i];

    var x = a[a.length - 1];
    var y = b[0];

    // Merging is much slower than append, so try to append if possible.
    if (x <= y) {
      if (x === y) {
        a[a.length - 1] = b[1];
        append(a, b, 2);
      }
      else {
        append(a, b, 0);
      }
    }
    else {
      a = orOp(a, b);
    }

    i++;
  }

  return a;
}

// \internal
//
// Append `b` to `a` starting at `offset`.
function append(a, b, offset) {
  var i = offset || 0;
  var len = b.length;

  while (i < len)
    a.push(b[i++]);
  return a;
}

// \internal
//
// Find an index that is closest to `value`.
function closestIndex(data, value) {
  // Should always be 2 or greater.
  var len = data.length;

  if (value <= data[1])
    return 0;

  if (value >= data[len - 2])
    return len - 2;

  var base = 0;
  var i = 0;

  for (var lim = len >>> 1; lim !== 0; lim >>>= 1) {
    i = base + (lim & ~1);

    var a = data[i];
    var b = data[i + 1];

    if (b <= value) {
      base = i + 2;
      lim--;
    }
    else if (a <= value) {
      return i;
    }
  }

  return i;
}

// \internal
//
// Get whether interval `data` contains value or interval `value`.
function testOp(a, value) {
  var aLen = a.length;
  var aIndex = 0;

  if (!aLen)
    return kTestNone;

  // Test scalar.
  if (typeof value === "number") {
    // Boundary check.
    if (value < a[0] || value >= a[aLen - 1])
      return kTestNone;

    aIndex = closestIndex(a, value);
    return (value >= a[aIndex] && value < a[aIndex + 1]) | 0;
  }

  // Test interval or list of intervals.
  if (!isArray(value))
    throw new TypeError("Expected an array or qintervals, got " + typeof value + ".");

  var b = value;
  var bLen = b.length;

  if (!bLen)
    return kTestNone;

  var b0 = b[0];
  var b1 = b[bLen - 1];

  aIndex = closestIndex(a, b0);
  var bIndex = 0;

  // Boundary check.
  if (b1 <= a[0] || b0 >= a[aLen - 1]) {
    return kTestNone;
  }

  // This is very similar to intersection, however, there is no output array.
  var full = 0;
  b1 = b[1];

  for (;;) {
    // Skip leading, non-intersecting intervals.
    var a1 = a[aIndex + 1];
    while (a1 <= b0) {
      if ((aIndex += 2) >= aLen)
        return full ? kTestPart : kTestNone;
      a1 = a[aIndex + 1];
    }

    var a0 = a[aIndex];
    if (b0 >= a0 && b1 <= a1)
      full += 2;
    else if (Math.max(a0, b0) < Math.min(a1, b1))
      return kTestPart;

    for (;;) {
      if ((bIndex += 2) >= bLen)
        return (bLen === full) ? kTestFull : kTestPart;

      b0 = b[bIndex];
      b1 = b[bIndex + 1];

      if (b1 > a1)
        break;
      full += 2;
    }
  }
}

// \internal
//
// Return a new array that contains `a` shifted by a scalar value `b`.
function shiftOp(data, value) {
  var output = [];

  var len = data.length;
  var last = -Number.MAX_VALUE;

  for (var i = 0; i < len; i += 2) {
    var a = data[i]     + value;
    var b = data[i + 1] + value;

    // If the offset rounded both numbers in a way that the interval became
    // ill-formed, reject it.
    if (a >= b)
      continue;

    if (a > last || !output.length)
      output.push(a, b);
    else
      output[output.length - 1] = b;

    last = b;
  }

  return output;
}

// \internal
//
// Return a new array that contains `a` OR `b`.
function orOp(a, b) {
  var output = [];

  var aIndex = 0;
  var bIndex = 0;

  var aLen = a.length;
  var bLen = b.length;

  if (a === b)
    return append(output, a);

  var x = 0.0;
  var y = 0.0;

  // Merge.
  while (aIndex < aLen && bIndex < bLen) {
    if (a[aIndex] < b[bIndex]) {
      x = a[aIndex];
      y = a[aIndex + 1];
      aIndex += 2;
    }
    else {
      x = b[bIndex];
      y = b[bIndex + 1];
      bIndex += 2;
    }

    var repeat;
    do {
      repeat = false;

      while (aIndex < aLen && a[aIndex] <= y) {
        y = Math.max(y, a[aIndex + 1]);
        aIndex += 2;
        repeat = true;
      }

      while (bIndex < bLen && b[bIndex] <= y) {
        y = Math.max(y, b[bIndex + 1]);
        bIndex += 2;
        repeat = true;
      }
    } while (repeat);

    output.push(x, y);
  }

  // Append.
  if (aIndex < aLen) return append(output, a, aIndex);
  if (bIndex < bLen) return append(output, b, bIndex);

  return output;
}

// \internal
//
// Return a new array that contains `a` AND `b`.
function andOp(a, b) {
  var output = [];

  var aIndex = 0;
  var bIndex = 0;

  var aLen = a.length;
  var bLen = b.length;

  if (aIndex >= aLen || bIndex >= bLen)
    return output;

  if (a === b)
    return a.slice(0, aLen);

  var x = 0.0;
  var y = 0.0;

  var a0 = 0.0, a1 = 0.0;
  var b0 = 0.0, b1 = 0.0;

  for (;;) {
    b0 = b[bIndex];
    for (;;) {
      // Skip all `a` intervals that don't intersect `b`.
      while (a[aIndex + 1] <= b0) {
        if ((aIndex += 2) >= aLen)
          return output;
      }

      // Skip all `b` intervals that don't intersect `a`.
      a0 = a[aIndex];
      while (b[bIndex + 1] <= a0) {
        if ((bIndex += 2) >= bLen)
          return output;
      }

      b0 = b[bIndex];
      a1 = a[aIndex + 1];

      if (a1 > b0)
        break;
    }

    b1 = b[bIndex + 1];
    for (;;) {
      x = Math.max(a0, b0);
      y = Math.min(a1, b1);

      if (x >= y)
        break;
      output.push(x, y);

      if (y === a1 && (aIndex += 2) >= aLen)
        return output;

      if (y === b1 && (bIndex += 2) >= bLen)
        return output;

      a0 = a[aIndex];
      a1 = a[aIndex + 1];

      b0 = b[bIndex];
      b1 = b[bIndex + 1];
    }
  }
}

// \internal
//
// Return a new array that contains `a` XOR `b`.
function xorOp(a, b) {
  var output = [];

  var aIndex = 0;
  var bIndex = 0;

  var aLen = a.length;
  var bLen = b.length;

  if (!aLen) return append(output, b);
  if (!bLen) return append(output, a);

  if (a === b)
    return output;

  var a0 = a[aIndex];
  var a1 = a[aIndex + 1];

  var b0 = b[bIndex];
  var b1 = b[bIndex + 1];

  var pos = Math.min(a0, b0);
  for (;;) {
    var x, y;
    if (a1 <= b0) {
      x   = Math.max(a0, pos);
      y   = a1;
      pos = a1;
    }
    else if (b1 <= a0) {
      x   = Math.max(b0, pos);
      y   = b1;
      pos = b1;
    }
    else {
      x   = pos;
      y   = Math.max(a0, b0);
      pos = Math.min(a1, b1);
    }

    // Merge.
    if (x < y) {
      var oLen = output.length;
      if (oLen && output[oLen - 1] === x)
        output[oLen - 1] = y;
      else
        output.push(x, y);
    }

    if (a1 <= pos) aIndex += 2;
    if (b1 <= pos) bIndex += 2;

    // If `a` is complete merge the rest of `b`.
    if (aIndex >= aLen) {
      if (bIndex >= bLen)
        return output;

      b0 = b[bIndex];
      b1 = b[bIndex + 1];

      b0 = Math.max(b0, pos);
      var oLen = output.length;

      if (oLen && output[oLen - 1] === b0)
        output[oLen - 1] = b1;
      else
        output.push(b0, b1);

      return append(output, b, bIndex + 2);
    }

    a0 = a[aIndex];
    a1 = a[aIndex + 1];

    // If `b` is complete merge the rest of `a`.
    if (bIndex >= bLen) {
      a0 = Math.max(a0, pos);
      var oLen = output.length;

      if (oLen && output[oLen - 1] === Math.max(a0, pos))
        output[oLen - 1] = a1;
      else
        output.push(a0, a1);

      return append(output, a, aIndex + 2);
    }

    b0 = b[bIndex];
    b1 = b[bIndex + 1];

    pos = Math.max(pos, Math.min(a0, b0));
  }

  return output;
}

// \internal
//
// Return a new array that contains `a` SUB `b`.
function subOp(a, b) {
  var output = [];

  var aIndex = 0;
  var bIndex = 0;

  var aLen = a.length;
  var bLen = b.length;

  if (!aLen) return output;
  if (!bLen) return append(output, a);

  if (a === b)
    return output;

  var a0 = a[aIndex];
  var a1 = a[aIndex + 1];

  var b0 = b[bIndex];
  var b1 = b[bIndex + 1];

  var pos = a0;
  var sub = b0;

  for (;;) {
    var x, y;
    var merge = true;

    if (a1 <= sub) {
      x = pos;
      y = pos = a1;
      merge = x < y;
    }
    else if (a0 >= sub) {
      pos = b1;
      merge = false;
    }
    else {
      x = pos;
      y = b0;
      pos = b1;
    }

    if (merge)
      output.push(x, y);

    if (a1 <= pos) {
      if ((aIndex += 2) >= aLen)
        return output;

      a0 = a[aIndex];
      a1 = a[aIndex + 1];
    }

    if (b1 <= pos) {
      // Merge the rest of `a`.
      if ((bIndex += 2) >= bLen) {
        while (aIndex < aLen) {
          x = Math.max(a[aIndex], pos);
          y = a[aIndex + 1];

          if (x < y)
            output.push(x, y);

          aIndex += 2;
        }
        return output;
      }

      b0 = b[bIndex];
      b1 = b[bIndex + 1];
    }

    sub = b0;
    pos = Math.max(pos, a0);
  }
}

// \internal
//
// Get well-formed data of `arg`.
function dataFromArg(arg, aKey, bKey) {
  if (arg instanceof qintervals)
    return arg.data;

  if (!isArray(arg))
    throw new TypeError("Expected an array or qintervals, got " + typeof arg + ".");

  var array = arg;
  var len = array.length;

  if (!len)
    return array;

  var first = array[0];
  if (typeof first === "number")
    return asWellFormed(array);

  if (typeof first === "object")
    return asWellFormedFromObjects(array, aKey, bKey);

  throw new TypeError("Expected an array of numbers or objects, got " + typeof first + ".");
}

// \internal
//
// Special case, which results in merging two lists of intervals.
function mergeOp(a, b) {
  var aLen = a.length;
  var bLen = b.length;

  var i = 0;

  if (!aLen) {
    for (i = 0; i < bLen; i += 2)
      a.push(b[i], b[i + 1]);
    return a;
  }

  if (!bLen) {
    return a;
  }

  var b0 = b[0];
  var a1 = a[aLen - 1];

  // Append.
  if (b0 >= a1) {
    // Merge first `b` interval with last `a` interval.
    if (b0 === a1) {
      a[aLen - 1] = b1;
      i += 2;
    }

    while (i < bLen) {
      a.push(b[i], b[i + 1]);
      i += 2;
    }

    return a;
  }

  var a0 = a[0];
  var b1 = b[bLen - 1];

  // Prepend.
  if (a0 >= b1) {
    // Merge last `b` interval with first `a` interval.
    i = bLen - 2;
    if (a0 === b1) {
      a[0] = b0;
      i -= 2;
    }

    while (i >= 0) {
      a.unshift(b[i], b[i + 1]);
      i -= 2;
    }
    return a;
  }

  // Shouldn't be hit...
  return a;
}

// \internal
//
// Special case, which results in clearing two lists of intervals.
function clearOp(a, b) {
  return (a.length === 0) ? a : [];
}

// \internal
//
// Special case, which results in keeping the original list of intervals as is.
function noOp(a, b) {
  return a;
}

// \internal
//
// Member operation (builder).
function memberOp(regularFn, specialFn) {
  return function() {
    var a = this.data;
    var b = null;
    var iLen = arguments.length;

    for (var i = 0; i < iLen; i++) {
      b = dataFromArg(arguments[i]);

      var aLen = a.length;
      var bLen = b.length;

      // Handle a special case where two lists of intervals are non-intersecting.
      if (!aLen || !bLen || a[0] >= b[bLen - 1] || a[aLen - 1] <= b[0])
        a = specialFn(a, b);
      else
        a = regularFn(a, b);
    }

    this.data = a;
    return this;
  };
}

// \internal
//
// Static operation (builder).
function staticOp(fn) {
  return function() {
    var iLen = arguments.length;
    if (!iLen) return new qintervals([]);

    var data = dataFromArg(arguments[0]);
    for (var i = 1; i < iLen; i++)
      data = fn(data, dataFromArg(arguments[i]));

    return new qintervals(data);
  };
}

// Get a reference to the internal packed data.
//
// NOTE: You shouldn't not change the data unless you are not gonna use the
// `qintervals` object anymore.
qintervals.prototype.getData = function() {
  return this.data;
};

// Return a copy of `qintervals` data in a packed format.
qintervals.prototype.toPacked = function() {
  var data = this.data;
  return data.slice(0, data.length);
};

// Convert a `qintervals` object into an array of arrays:
//
// For example an interval:
//   [1, 2, 3, 4]
// would be converted to:
//   [[1, 2], [3, 4]]
qintervals.prototype.toArrays = function() {
  var output = [];

  var data = this.data;
  var len = data.length;

  for (var i = 0; i < len; i += 2)
    output.push([data[i], data[i + 1]]);

  return output;
};

// Convert a `qintervals` object into an array of objects:
//
// For example an interval:
//   [1, 2, 3, 4]
// would be converted to:
//   [{ from: 1, to: 2}, { from: 3, to: 4 }]
qintervals.prototype.toObjects = function(aKey, bKey) {
  if (!aKey) aKey = "from";
  if (!bKey) bKey = "to";

  var output = [];

  var data = this.data;
  var len = data.length;

  for (var i = 0; i < len; i += 2) {
    var obj = {};
    obj[aKey] = data[i];
    obj[bKey] = data[i + 1];
    output.push(obj);
  }

  return output;
};

// \function `qintervals.prototype.toString()`
//
// Return interval as a string.
qintervals.prototype.toString = function() {
  return this.data.toString();
};

// \function `qintervals.equals(a, b)`
// \function `qintervals.prototype.equals(other)`
//
// Get whether two interval lists are equal.
qintervals.equals = function(a, b) {
  return equals(dataFromArg(a), dataFromArg(b));
};

qintervals.prototype.equals = function(other) {
  if (this === other)
    return true;
  return equals(this.data, dataFromArg(other));
};

// \function `qintervals.prototype.isEmpty()`
//
// Get whether the list of intervals is empty.
qintervals.prototype.isEmpty = function() {
  return this.data.length === 0;
};

// \function `qintervals.prototype.getCount()`
//
// Get count of intervals stored.
qintervals.prototype.getCount = function() {
  return this.data.length;
};

// \function `qintervals.prototype.clear()`
qintervals.prototype.clear = function() {
  this.data.length = 0;
  return this;
};

// \function `qintervals.test(self, value)`
// \function `qintervals.prototype.test(value)`
//
// Test whether the list of intervals contains a scalar value or another list.
//
// The function can return the following values:
//   - `kTestNone` - No match.
//   - `kTestFull` - Full match.
//   - `kTestPart` - Partial match.
qintervals.test = function(a, value) {
  if (typeof value === "number") {
    // It's a `qintervals` instance, proceed with `testOp()`.
    if (a instanceof qintervals)
      return testOp(a.data, value);

    if (!isArray(a))
      throw new TypeError("Expected an array or qintervals, got " + typeof a + ".");

    var array = a;
    var i, len = array.length;

    if (!len)
      return kTestNone;

    // If the value is scalar we don't really need to do any conversion to just
    // test if it's within all the intervals. Constructing a binary searchable
    // list takes much longer than just one traversal. This is handled only in
    // static method as prototype method guarantees binary searchable data.
    var first = array[0];
    if (typeof first === "number") {
      for (i = 0; i < len; i += 2) {
        if (value >= array[i] && value < array[i + 1])
          return kTestFull;
      }

      return kTestNone;
    }

    return testOp(dataFromArg(a), b);
  }
  else {
    var data = dataFromArg(a);
    var b = dataFromArg(value);

    if (data === b)
      return data.length ? kTestFull : kTestNone;
    else
      return testOp(data, b);
  }
};

qintervals.prototype.test = function(value) {
  var a = this.data;

  if (typeof value === "number")
    return testOp(a, value);

  var b = dataFromArg(value);
  if (a === b)
    return a.length ? kTestFull : kTestNone;
  else
    return testOp(a, b);
};

// \function `qintervals.shift(a, value)`
// \function `qintervals.prototype.shift(value)`
//
// Shift a list of intervals `a` by a scalar `value`, returning a new `qintervals`.
//
// NOTE: If you store intervals as floating point numbers shifting can cause
// the number of intervals to decrease if rounding caused one or more interval
// to became continuous.
qintervals.shift = function(a, value) {
  return new qintervals(shiftOp(dataFromArg(a), value));
};

qintervals.prototype.shift = function(value) {
  if (!value)
    return this;

  var data = this.data;
  var len = data.length;

  var last = -Number.MAX_VALUE;
  var storeIndex = 0;

  for (var i = 0; i < len; i += 2) {
    var a = data[i] + value;
    var b = data[i + 1] + value;

    // If the offset rounded both numbers in a way that the interval became
    // ill-formed, reject it.
    if (a >= b)
      continue;

    if (a > last || !storeIndex) {
      data[storeIndex] = a;
      data[storeIndex + 1] = b;
      storeIndex += 2;
    }
    else {
      data[storeIndex - 1] = b;
    }

    last = b;
  }

  if (i !== storeIndex)
    data.length = storeIndex;

  return this;
};

// \function `qintervals.union(...)`
// \function `qintervals.or(...)`
//
// Union two or more lists of intervals, returninig a new `qintervals`.
qintervals.union =
  qintervals.or =
    staticOp(orOp);

// \function `qintervals.prototype.union(...)`
// \function `qintervals.prototype.or(...)`
//
// Union with one or more interval lists in-place.
qintervals.prototype.union =
  qintervals.prototype.or =
    memberOp(orOp, mergeOp);

// \function `qintervals.intersect(...)`
// \function `qintervals.and(...)`
//
// Intersect two or more lists of intervals, returninig a new `qintervals`.
qintervals.intersect =
  qintervals.and =
    staticOp(andOp);

// \function `qintervals.prototype.intersect(...)`
// \function `qintervals.prototype.and(...)`
//
// Intersect with one or more interval lists in-place.
qintervals.prototype.intersect =
  qintervals.prototype.and =
    memberOp(andOp, clearOp);

// \function `qintervals.xor(...)`
//
// Xor two or more lists of intervals, returninig a new `qintervals`.
qintervals.xor =
  staticOp(xorOp);

// \function `qintervals.prototype.xor(...)`
//
// Xor with one or more interval lists in-place.
qintervals.prototype.xor =
  memberOp(xorOp, mergeOp);

// \function `qintervals.subtract(...)`
// \function `qintervals.sub(...)`
//
// Subtract two or more lists of intervals, returninig a new `qintervals`.

qintervals.subtract =
  qintervals.sub =
    staticOp(subOp);

// \function `qintervals.prototype.subtract(...)`
// \function `qintervals.prototype.sub(...)`
//
// Subtract with one or more interval lists in-place.
qintervals.prototype.subtract =
  qintervals.prototype.sub =
    memberOp(subOp, noOp);

$export[$as] = qintervals;

}).apply(this, typeof module === "object" ? [module, "exports"] : [this, "qintervals"]);
