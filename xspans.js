// xspans.js <https://github.com/jsstuff/xspans>
(function($export, $as) {
"use strict";

const isArray = Array.isArray;
const hasOwn = Object.prototype.hasOwnProperty;

function throwTypeError(msg) {
  throw new TypeError(msg);
}

/**
 * Preferred constructor to create a new `xspans` instance based on `src`,
 * which can be `xspans` instance, an array of packed spans, or an array
 * of objects.
 *
 * If no argument is provided an empty instance of `xspans` is returned.
 *
 * @param src Input data.
 * @param aKey In case that the `data` is an array of objects, `aKey` can be
 *   used to specify which key represents the beginning of the span-array.
 * @param bKey In case that the `data` is an array of objects, `bKey` can be
 *   used to specify which key represents the end of the span-array.
 * @return {xspans}
 *
 * @class
 * @alias xspans
 */
function xspans(src, aKey, bKey) {
  var data = null;

  if (!(this instanceof xspans))
    return new xspans(src, aKey, bKey);

  if (!src)
    data = [];
  else if (src instanceof xspans)
    data = src.data.slice(0, src.data.length);
  else
    data = dataFromArg(src, aKey, bKey);

  this.data = data;
}

/**
 * xspans version in "major.minor.patch" form.
 *
 * @alias xspans.VERSION
 */
xspans.VERSION = "1.0.0";

/**
 * A testing value or an array instance didn't hit the `xspans`.
 *
 * @alias xspans.kTestNone
 */
const kTestNone = xspans.kTestNone = 0;

/**
 * A testing value or an array instance completely hits the `xspans`.
 *
 * @alias xspans.kTestFull
 */
const kTestFull = xspans.kTestFull = 1;

/**
 * A testing value or an array instance partially hits the `xspans`.
 *
 * @alias xspans.kTestPart
 */
const kTestPart = xspans.kTestPart = 2;

/**
 * Autodetects a property contained in `obj` based on a property list `props`.
 *
 * @param {object} obj Object to check.
 * @param {string[]} props Property names to check.
 * @return {string} Property key that matches
 *
 * @throws {TypeError} If matching property couldn't be found.
 *
 * @private
 */
function detectKey(obj, props) {
  for (var i = 0, len = props.length; i < len; i++) {
    const key = props[i];
    if (hasOwn.call(obj, key))
      return key;
  }

  throwTypeError("Couldn't detect which property describes the span start/end");
}

const DetectFrom = ["from", "start", "a"];
const DetectTo   = ["to"  , "end"  , "b"];

// Equality check - the arrays `a` and `b` must be sorted and coalesced.
function equals(a, b) {
  const aLen = a.length;
  const bLen = b.length;

  if (aLen !== bLen)
    return false;

  for (var i = 0; i < aLen; i++)
    if (a[i] !== b[i])
      return false;

  return true;
}

/**
 * Checks if `data` is a well-formed span-array.
 *
 * Well-formed means:
 *
 *   - Spans are sorted.
 *   - Spans don't intersect.
 *   - Spans are coalesced - `[1, 3]` is valid, `[1, 2, 2, 3]` is not.
 *
 * @private
 */
function isWellFormed(data) {
  const len = data.length;
  if (len === 0)
    return true;

  var last = data[1];
  if (data[0] >= last)
    return false;

  for (var i = 2; i < len; i += 2) {
    const x = data[i];
    const y = data[i + 1];

    if (typeof x !== "number" || typeof y !== "number")
      return false;

    if (last >= x || x >= y)
      return false;

    last = y;
  }

  return true;
}

/**
 * Converts an input `src` into a well-formed span-array.
 *
 * Returns an array of well-formed data that can be same as `src` passed in
 * case that spans inside are sorted, don't intersect, and are coalesced.
 *
 * @param {array} src Array to check and convert if necessary.
 * @return {array} Well-formed span-array.
 *
 * @private
 */
function asWellFormed(src) {
  if (isWellFormed(src))
    return src;

  var i;
  var len = src.length;

  var a = 0.0;
  var b = 0.0;
  var t = 0.0;
  var last = -Number.MAX_VALUE;

  var arrays = null;
  var output = [];

  for (i = 0; i < len; i += 2) {
    a = src[i];
    b = src[i + 1];

    if (typeof a !== "number") throwTypeError("Expected Number, got " + typeof a);
    if (typeof b !== "number") throwTypeError("Expected Number, got " + typeof b);

    if (a >= b) {
      if (a === b)
        continue;

      t = a;
      a = b;
      b = t;
    }

    // Append/Merge into the last span of `output`.
    if (a >= last) {
      if (a === last && output.length !== 0)
        output[output.length - 1] = b;
      else
        output.push(a, b);

      last = b;
      continue;
    }
    // Prepend/Merge into the first span of `output`.
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

/**
 * Converts an input array of arrays `src` into a well-formed span-array.
 *
 * @param {array[]} src Source array.
 * @return {array} Well-formed span-array.
 *
 * @private
 */
function asWellFormedFromArrays(src) {
  var output = [];
  const len = src.length;

  if (!len)
    return output;

  var a = 0.0;
  var b = 0.0;
  var t = 0.0;

  var arrays = null;
  var last = -Number.MAX_VALUE;

  for (var i = 0; i < len; i++) {
    const obj = src[i];

    a = obj[0];
    b = obj[1];

    if (typeof a !== "number") throwTypeError("Expected Number, got " + typeof a);
    if (typeof b !== "number") throwTypeError("Expected Number, got " + typeof b);

    if (a >= b) {
      if (a === b)
        continue;

      t = a;
      a = b;
      b = t;
    }

    // Append/Merge into the last span of `output`.
    if (a >= last) {
      if (a === last && output.length !== 0)
        output[output.length - 1] = b;
      else
        output.push(a, b);

      last = b;
      continue;
    }
    // Prepend/Merge into the first span of `output`.
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

/**
 * Converts an input array of objects `src` into a well-formed span-array.
 *
 * @param {object[]} src Source array.
 * @param {string} [aKey] Lower bound property name.
 * @param {string} [bKey] Upper bound property name.
 * @return {array} Well-formed span-array.
 *
 * @private
 */
function asWellFormedFromObjects(src, aKey, bKey) {
  var output = [];
  const len = src.length;

  if (!len)
    return output;

  var a = 0.0;
  var b = 0.0;
  var t = 0.0;

  var arrays = null;
  var last = -Number.MAX_VALUE;

  if (!aKey) aKey = DetectFrom[0];
  if (!bKey) bKey = DetectTo[0];

  for (var i = 0; i < len; i++) {
    const obj = src[i];

    if (!hasOwn.call(obj, aKey)) aKey = detectKey(obj, DetectFrom);
    if (!hasOwn.call(obj, bKey)) bKey = detectKey(obj, DetectTo);

    a = obj[aKey];
    b = obj[bKey];

    if (typeof a !== "number") throwTypeError("Expected Number, got " + typeof a);
    if (typeof b !== "number") throwTypeError("Expected Number, got " + typeof b);

    if (a >= b) {
      if (a === b)
        continue;

      t = a;
      a = b;
      b = t;
    }

    // Append/Merge into the last span of `output`.
    if (a >= last) {
      if (a === last && output.length !== 0)
        output[output.length - 1] = b;
      else
        output.push(a, b);

      last = b;
      continue;
    }
    // Prepend/Merge into the first span of `output`.
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

/**
 * Returns `xspans` object reusing/wrapping an existing array of packed spans.
 *
 * NOTE: This is a low-level function that just wraps a given `array` to be used
 * by `xspans` object, it doesn't copy the values if they are well-formed
 * (sorted, coalesced, and non-intersecting).
 *
 * @param {*} src Source data - array of arrays/objects, or an `xspans` instance.
 * @return {xspans}
 *
 * @alias xspans.wrap
 */
function wrap(src) {
  return new xspans(asWellFormed(src));
}
xspans.wrap = wrap;

/**
 * Incrementally merges (unions) array of arrays passed in `arrays`.
 *
 * @param {number[][]} arr Array of arrays.
 * @return {array} Array containing all span-arrays merged and coalesced.
 *
 * @private
 */
function mergeArrays(arr) {
  var len = arr.length;

  // Handle the corner cases first that import functions shouldn't really
  // produce as `multimerge()` is only called internally, it's not exported.
  if (len === 0) return arr;
  if (len === 1) return arr[0];

  var i = 1;
  var a = arr[0];

  while (i < len) {
    const b = arr[i];
    const x = a[a.length - 1];
    const y = b[0];

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

/**
 * Appends `b` to `a` starting at `offset`.
 *
 * @param {array} a Destination array.
 * @param {array} b Source array.
 * @param {number} offset The first number of `b` to start appending.
 *
 * @private
 */
function append(a, b, offset) {
  var i = offset || 0;
  var len = b.length;

  while (i < len)
    a.push(b[i++]);
  return a;
}

/**
 * Finds an index that's the closest to the given `value`.
 *
 * @param {array} arr Normalized span-array.
 * @param value Value to find.
 * @return {number} The closest index.
 *
 * @private
 */
function closestIndex(arr, value) {
  // Should always be 2 or greater.
  const len = arr.length;

  if (value <= arr[1])
    return 0;

  if (value >= arr[len - 2])
    return len - 2;

  var base = 0;
  var i = 0;

  for (var lim = len >>> 1; lim !== 0; lim >>>= 1) {
    i = base + (lim & ~1);

    const a = arr[i];
    const b = arr[i + 1];

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

/**
 * Checks if `a` contains value or span-array `value`.
 *
 * @private
 */
function testOp(a, value) {
  const aLen = a.length;
  if (!aLen)
    return kTestNone;

  var aIndex = 0;
  var bIndex = 0;

  // Test scalar.
  if (typeof value === "number") {
    // Boundary check.
    if (value < a[0] || value >= a[aLen - 1])
      return kTestNone;

    aIndex = closestIndex(a, value);
    return (value >= a[aIndex] && value < a[aIndex + 1]) | 0;
  }

  // Test span or span-array.
  if (!isArray(value))
    throwTypeError("Expected an array or xspans, got " + typeof value);

  const b = value;
  const bLen = b.length;

  if (!bLen)
    return kTestNone;

  var b0 = b[0];
  var b1 = b[bLen - 1];
  aIndex = closestIndex(a, b0);

  // Boundary check.
  if (b1 <= a[0] || b0 >= a[aLen - 1])
    return kTestNone;

  // This is very similar to intersection, however, there is no output array.
  var full = 0;
  b1 = b[1];

  for (;;) {
    // Skip leading, non-intersecting spans.
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

/**
 * Shifts `data` by `offset`.
 *
 * private
 */
function shiftOp(data, offset) {
  var output = [];
  const len = data.length;

  var last = -Number.MAX_VALUE;
  for (var i = 0; i < len; i += 2) {
    const a = data[i]     + offset;
    const b = data[i + 1] + offset;

    // Only continue if both numbers are finite and form a span.
    if (a < b) {
      if (a > last || !output.length)
        output.push(a, b);
      else
        output[output.length - 1] = b;

      last = b;
    }
  }

  return output;
}

/**
 * Scales `data` by `scale`.
 */
function scaleOp(data, scale) {
  if (scale < 0)
    throwTypeError("Invalid scale: " + scale);

  var output = [];
  const len = data.length;

  var last = -Number.MAX_VALUE;
  for (var i = 0; i < len; i += 2) {
    const a = data[i]     * scale;
    const b = data[i + 1] * scale;

    // Only continue if both numbers are finite and form a span.
    if (a < b) {
      if (a > last || !output.length)
        output.push(a, b);
      else
        output[output.length - 1] = b;

      last = b;
    }
  }

  return output;
}

/**
 * Performs `a OR b` and returns a new array containing the result.
 *
 * @private
 */
function orOp(a, b) {
  var output = [];

  if (a === b)
    return append(output, a);

  const aLen = a.length;
  const bLen = b.length;

  var aIndex = 0;
  var bIndex = 0;

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

/**
 * Performs `a AND b` and returns a new array containing the result.
 *
 * @private
 */
function andOp(a, b) {
  var output = [];

  const aLen = a.length;
  const bLen = b.length;

  var aIndex = 0;
  var bIndex = 0;

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
      // Skip all `a` spans that don't intersect `b`.
      while (a[aIndex + 1] <= b0) {
        if ((aIndex += 2) >= aLen)
          return output;
      }

      // Skip all `b` spans that don't intersect `a`.
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

/**
 * Performs `a XOR b` and returns a new array containing the result.
 *
 * @private
 */
function xorOp(a, b) {
  var output = [];

  if (a === b)
    return output;

  const aLen = a.length;
  const bLen = b.length;

  if (!aLen) return append(output, b);
  if (!bLen) return append(output, a);

  var aIndex = 0;
  var bIndex = 0;

  var a0 = a[aIndex];
  var a1 = a[aIndex + 1];

  var b0 = b[bIndex];
  var b1 = b[bIndex + 1];

  var pos = Math.min(a0, b0);
  var oLen = 0;

  // Hint for VM, initial values are never used.
  var x = 0;
  var y = 0;

  for (;;) {
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
      oLen = output.length;
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
      oLen = output.length;

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
      oLen = output.length;

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
}

/**
 * Performs `a SUB b` and returns a new array containing the result.
 *
 * @private
 */
function subOp(a, b) {
  var output = [];

  const aLen = a.length;
  const bLen = b.length;

  if (!aLen) return output;
  if (!bLen) return append(output, a);

  if (a === b)
    return output;

  var aIndex = 0;
  var bIndex = 0;

  var a0 = a[aIndex];
  var a1 = a[aIndex + 1];

  var b0 = b[bIndex];
  var b1 = b[bIndex + 1];

  var pos = a0;
  var sub = b0;

  // Hint for VM, initial values are never used.
  var x = 0;
  var y = 0;

  for (;;) {
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

    while (a1 <= pos) {
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

/**
 * Converts data from `src` into a span-array.
 *
 * @private
 */
function dataFromArg(src, aKey, bKey) {
  if (src instanceof xspans)
    return src.data;

  if (!isArray(src))
    throwTypeError("Expected an array or xspans, got " + typeof src);

  const array = src;
  const len = array.length;

  if (!len)
    return array;

  const first = array[0];
  if (typeof first === "number")
    return asWellFormed(array);

  if (typeof first !== "object")
    throwTypeError("Expected an array, got " + typeof first);

  if (isArray(first))
    return asWellFormedFromArrays(array);
  else
    return asWellFormedFromObjects(array, aKey, bKey);
}

/**
 * Special case, which results in merging two span-arrays.
 *
 * @private
 */
function mergeOp(a, b) {
  const aLen = a.length;
  const bLen = b.length;

  var i = 0;

  if (!aLen) {
    for (i = 0; i < bLen; i += 2)
      a.push(b[i], b[i + 1]);
    return a;
  }

  if (!bLen)
    return a;

  var b0 = b[0];
  var b1 = b[bLen - 1];
  var a1 = a[aLen - 1];

  // Append.
  if (b0 >= a1) {
    // Merge the first `b` span with the last `a` span.
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

  // Prepend.
  var a0 = a[0];
  if (a0 >= b1) {
    // Merge the last `b` span with the first `a` span.
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

/**
 * Special case, which results in clearing two span-arrays.
 *
 * @param {array} a Source array.
 * @param {array} b Ignored, just a compatibility with the interface.
 *
 * @private
 */
function clearOp(a, b) {
  return (a.length === 0) ? a : [];
}

/**
 * Special case, which results in keeping the original span-array as is.
 *
 * @private
 */
function noOp(a, b) {
  return a;
}

/**
 * Builds a member function that calls either `regularFn` or `specialFn`.
 *
 * @return {this}
 *
 * @private
 */
function memberOp(regularFn, specialFn) {
  return function() {
    var a = this.data;
    var b = null;
    var iLen = arguments.length;

    for (var i = 0; i < iLen; i++) {
      b = dataFromArg(arguments[i]);

      var aLen = a.length;
      var bLen = b.length;

      // Handle a special case where two span-arrays are non-intersecting.
      if (!aLen || !bLen || a[0] >= b[bLen - 1] || a[aLen - 1] <= b[0])
        a = specialFn(a, b);
      else
        a = regularFn(a, b);
    }

    this.data = a;
    return this;
  };
}

/**
 * Builds a static function.
 *
 * @private
 */
function staticOp(fn) {
  return function() {
    const iLen = arguments.length;
    if (!iLen) return new xspans([]);

    var data = dataFromArg(arguments[0]);
    for (var i = 1; i < iLen; i++)
      data = fn(data, dataFromArg(arguments[i]));

    return new xspans(data);
  };
}

/**
 * Returns the internal data of the `xspans` instance.
 *
 * NOTE: The returned data is a weak-copy. That's it, if you modify the array
 * returned you will also modify the `xspans` instance itself. Altering the
 * returned data (without cloning) can break a validity of `xspans` instance
 * if that instance is used, howeer, it's perfectly fine to alter it if the
 * life-cycle of the instance ends.
 *
 * @return {number[]} Internal data of `xspans`.
 */
xspans.prototype.getData = function() {
  return this.data;
};

/**
 * Returns a copy of `xspans` data in a packed format (array of numbers).
 *
 * @return {number[]} A normalized span-array.
 */
xspans.prototype.toPacked = function() {
  const data = this.data;
  return data.slice(0, data.length);
};

/**
 * Converts the `xspans` object into an array of arrays:
 *
 * For example a span-list `[1, 2, 3, 4]` would be converted to `[[1, 2], [3, 4]]`.
 *
 * @return {number[][2]}
 */
xspans.prototype.toArrays = function() {
  var output = [];

  const data = this.data;
  const len = data.length;

  for (var i = 0; i < len; i += 2)
    output.push([data[i], data[i + 1]]);

  return output;
};

/**
 * Convert an `xspans` instance into an array of objects:
 *
 * For example a span-list:
 *   `[1, 2, 3, 4]`
 * would be converted to:
 *   `[{ from: 1, to: 2}, { from: 3, to: 4 }]`
 *
 * @param {string} [aKey] Optional lower bound property name (default `"from"`).
 * @param {string} [bKey] Optional upper bound property name (default `"to"`).
 * @return {object[]} Array of objects, where each object represents a single
 *   span.
 */
xspans.prototype.toObjects = function(aKey, bKey) {
  if (!aKey) aKey = "from";
  if (!bKey) bKey = "to";

  var output = [];

  const data = this.data;
  const len = data.length;

  for (var i = 0; i < len; i += 2) {
    const obj = {};
    obj[aKey] = data[i];
    obj[bKey] = data[i + 1];
    output.push(obj);
  }

  return output;
};

/**
 * Converts the `xspans` instance into a string.
 *
 * @return {string}
 */
xspans.prototype.toString = function() {
  return this.data.toString();
};

/**
 * Checks if two `xspans` are equivalent, performs a deep check (static).
 *
 * @param {xspans} a The first `xspans` instance.
 * @param {xspans} a The second `xspans` instance.
 * @return {boolean} True of both `a` and `b` are equivalent.
 */
xspans.equals = function(a, b) {
  return equals(dataFromArg(a), dataFromArg(b));
};

/**
 * Checks if two `xspans` are equivalent, performs a deep check (method).
 *
 * @param {xspans} other The `xspans` instance to check with.
 * @return {boolean} True of both `this` and `other` are equivalent.
 */
xspans.prototype.equals = function(other) {
  if (this === other)
    return true;
  return equals(this.data, dataFromArg(other));
};

/**
 * Checks if the `xspans` instance is empty.
 * @return {boolean}
 */
xspans.prototype.isEmpty = function() {
  return this.data.length === 0;
};

/**
 * Get number of spans in the `xspans` container.
 *
 * NOTE: Two numbers form a single span, thus data like `[1, 2]` would return `1`.
 *
 * @return {number} The total number of spans the container holds.
 */
xspans.prototype.getCount = function() {
  return Math.floor(this.data.length / 2);
};

/**
 * Clears all spans and returns itself.
 *
 * @return {this}
 */
xspans.prototype.clear = function() {
  this.data.length = 0;
  return this;
};

/**
 * Checks if a `xspans` instance `a` contains a scalar `value` or another `xspans`.
 *
 * The function can return the following values:
 *   - `kTestNone` - No match.
 *   - `kTestFull` - Full match.
 *   - `kTestPart` - Partial match.
 *
 * @param {*} a First source parameter, `xspans` or compatible.
 * @param {*} value Value or `xspans` to hit-test.
 * @return {number} Returns `kTestNone`, `kTestFull`, or `kTestPart`.
 */
xspans.test = function(a, value) {
  if (typeof value === "number") {
    // It's an `xspans` instance, proceed with `testOp()`.
    if (a instanceof xspans)
      return testOp(a.data, value);

    if (!isArray(a))
      throwTypeError("Expected an array or xspans, got " + typeof a);

    const array = a;
    const len = array.length;

    if (!len)
      return kTestNone;

    // If the value is scalar we don't really need to do any conversion to just
    // test if it's within all the spans. Constructing a binary searchable
    // array takes much longer than just one traversal. This is handled only in
    // static method as prototype method guarantees binary searchable data.
    const first = array[0];
    if (typeof first === "number") {
      for (var i = 0; i < len; i += 2) {
        if (value >= array[i] && value < array[i + 1])
          return kTestFull;
      }

      return kTestNone;
    }

    return testOp(dataFromArg(a), value);
  }
  else {
    const data = dataFromArg(a);
    const b = dataFromArg(value);

    return data === b ? (data.length ? kTestFull : kTestNone) : testOp(data, b);
  }
};

xspans.prototype.test = function(value) {
  const a = this.data;
  if (typeof value === "number")
    return testOp(a, value);

  const b = dataFromArg(value);
  if (a === b)
    return a.length ? kTestFull : kTestNone;
  else
    return testOp(a, b);
};

/**
 * Offsets all spans of `a` by a scalar value `offset`, returning a new `xspans`
 * instance.
 *
 * NOTE: If spans in `a` contain fractions then operations such `shift` can
 * cause rounding of lower / upper bounds of each span. If two spans are close
 * to each such rounding can make them contiguous (i.e. two or more spans merge
 * to one).
 *
 * @param {xspans} `a` The instance of `xspans` to shift.
 * @param {number} offset Shift offset.
 * @return {xspans} New `xspans` instance, which contains shifted spans.
 */
xspans.shift = function(a, offset) {
  return new xspans(shiftOp(dataFromArg(a), offset));
};

xspans.prototype.shift = function(offset) {
  if (!offset)
    return this;

  const data = this.data;
  const len = data.length;

  var last = -Number.MAX_VALUE;
  var storeIndex = 0;

  for (var i = 0; i < len; i += 2) {
    const a = data[i    ] + offset;
    const b = data[i + 1] + offset;

    // Only continue if both numbers are finite and form a span.
    if (a < b) {
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
  }

  if (i !== storeIndex)
    data.length = storeIndex;

  return this;
};

/**
 * Scales all spans of `a` by a scalar value `scale`, returning a new `xspans`
 * instance.
 *
 * NOTE: The number of spans in the resulting `xspans` instance may be lower
 * than the number of soans of the input if rounding causes one or more span
 * to became invalid or to coalesce with previous span(s)
 *
 * @param {xspans} `a` The instance of `xspans` to scale.
 * @param {number} scale Scale value.
 * @return {xspans} New `xspans` instance, which contains scaled spans.
 */
xspans.scale = function(a, scale) {
  return new xspans(scaleOp(dataFromArg(a), scale));
};

xspans.prototype.scale = function(scale) {
  if (scale === 1)
    return this;

  if (scale < 0)
    throwTypeError("Invalid scale: " + scale);

  const data = this.data;
  const len = data.length;

  var last = -Number.MAX_VALUE;
  var storeIndex = 0;

  for (var i = 0; i < len; i += 2) {
    const a = data[i    ] * scale;
    const b = data[i + 1] * scale;

    // Only continue if both numbers are finite and form a span.
    if (a < b) {
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
  }

  if (i !== storeIndex)
    data.length = storeIndex;

  return this;
};

/**
 * Performs `a OR ...args` and returns a new `xspans` instance.
 *
 * @param {xspans} a The first source `xspans` instance or compatible.
 * @param {...xspans} args Second (or more) `xspans` or compatible.
 * @return {xspans} A new `xspans` instance.
 *
 * @alias xspans.union
 * @alias xspans.or
 */
xspans.union =
  xspans.or =
    staticOp(orOp);

/**
 * Performs `this OR ...args` in-place and returns `this`.
 *
 * @param {...xspans} args `xspans` or compatible.
 * @return {this}.
 *
 * @alias xspans.prototype.union
 * @alias xspans.prototype.or
 */
xspans.prototype.union =
  xspans.prototype.or =
    memberOp(orOp, mergeOp);

/**
 * Performs `a AND ...args` and returns a new `xspans` instance.
 *
 * @param {xspans} a The first source `xspans` instance or compatible.
 * @param {...xspans} args Second (or more) `xspans` or compatible.
 * @return {xspans} A new `xspans` instance.
 *
 * @alias xspans.intersect
 * @alias xspans.and
 */
xspans.intersect =
  xspans.and =
    staticOp(andOp);

/**
 * Performs `this AND ...args` in-place and returns `this`.
 *
 * @param {...xspans} args `xspans` or compatible.
 * @return {this}.
 *
 * @alias xspans.prototype.intersect
 * @alias xspans.prototype.and
 */
xspans.prototype.intersect =
  xspans.prototype.and =
    memberOp(andOp, clearOp);

/**
 * Performs `a XOR ...args` and returns a new `xspans` instance.
 *
 * @param {xspans} a The first source `xspans` instance or compatible.
 * @param {...xspans} args Second (or more) `xspans` or compatible.
 * @return {xspans} A new `xspans` instance.
 *
 * @alias xspans.xor
 */
xspans.xor =
  staticOp(xorOp);

/**
 * Performs `this XOR ...args` in-place and returns `this`.
 *
 * @param {...xspans} args `xspans` or compatible.
 * @return {this}.
 *
 * @alias xspans.prototype.xor
 */
xspans.prototype.xor =
  memberOp(xorOp, mergeOp);

/**
 * Performs `a SUB ...args` and returns a new `xspans` instance.
 *
 * @param {xspans} a The first source `xspans` instance or compatible.
 * @param {...xspans} args Second (or more) `xspans` or compatible.
 * @return {xspans} A new `xspans` instance.
 *
 * @alias xspans.subtract
 * @alias xspans.sub
 */
xspans.subtract =
  xspans.sub =
    staticOp(subOp);

/**
 * Performs `this SUB ...args` in-place and returns `this`.
 *
 * @param {...xspans} args `xspans` or compatible.
 * @return {this}.
 *
 * @alias xspans.prototype.subtract
 * @alias xspans.prototype.sub
 */
xspans.prototype.subtract =
  xspans.prototype.sub =
    memberOp(subOp, noOp);

$export[$as] = xspans;

}).apply(this, typeof module === "object" ? [module, "exports"] : [this, "xspans"]);
