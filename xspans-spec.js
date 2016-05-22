// xspans.js <https://github.com/exjs/xspans>
"use strict"

const assert = require("assert");
const xspans = require("./xspans");

describe("xspans", function() {
  const kTestNone = xspans.kTestNone;
  const kTestFull = xspans.kTestFull;
  const kTestPart = xspans.kTestPart;

  it("should wrap packed values if they are well-formed.", function() {
    var packed;

    packed = [];
    assert(xspans.wrap(packed).getData() === packed);

    packed = [1, 2];
    assert(xspans.wrap(packed).getData() === packed);

    packed = [1, 2, 4, 5, 10, 19, 20, 24];
    assert(xspans.wrap(packed).getData() === packed);
  });

  it("should sanity ill-formed packed arguments.", function() {
    assert(xspans.equals([1, 2, 2, 3], [1, 3]));
    assert(xspans.equals([2, 3, 1, 2], [1, 3]));
    assert(xspans.equals([3, 4, 1, 2], [1, 2, 3, 4]));
    assert(xspans.equals([1, 2, 3, 4, -1, 5], [-1, 5]));
  });

  it("should convert from array of arrays.", function() {
    assert(xspans([[1, 2]]).equals([1, 2]));
    assert(xspans([[1, 2], [4, 5]]).equals([1, 2, 4, 5]));
  });

  it("should convert from array of objects.", function() {
    var data;

    data = [
      { from: 1, to: 2 },
      { from: 4, to: 5 }
    ];
    assert(xspans(data).equals([1, 2, 4, 5]));

    data = [
      { from: 4, to: 5 },
      { from: 1, to: 2 }
    ];
    assert(xspans(data).equals([1, 2, 4, 5]));


    data = [
      { from: 1, to: 2 },
      { from: 2, to: 3 }
    ];
    assert(xspans(data).equals([1, 3]));

    data = [
      { from: 1, to: 2 },
      { from: 2, to: 3 },
      { from: 5, to: 6 },
      { from: 6, to: 8 },
      { from:-1, to: 10}
    ];
    assert(xspans(data).equals([-1, 10]));
  });

  it("should test `test` functionality.", function() {
    var a = [0, 1];
    var b = [0, 1, 5, 6, 10, 11];

    assert(xspans.test(a, []) === kTestNone);
    assert(xspans.test(b, []) === kTestNone);

    assert(xspans.test(a, a) === kTestFull);
    assert(xspans.test(b, b) === kTestFull);

    assert(xspans.test(a, 0.0) === kTestFull);
    assert(xspans.test(a, 0.5) === kTestFull);
    assert(xspans.test(a, 1.0) === kTestNone); // Not part of the span.

    assert(xspans.test(a, [ 0, 0.5]) === kTestFull);
    assert(xspans.test(a, [ 0, 1.0]) === kTestFull);
    assert(xspans.test(a, [ 0, 1.5]) === kTestPart);
    assert(xspans.test(a, [-1, 1.0]) === kTestPart);
    assert(xspans.test(a, [ 1, 1.5]) === kTestNone);

    assert(xspans.test(b, [0, 1]      ) === kTestFull);
    assert(xspans.test(b, [0, 1, 5, 6]) === kTestFull);
    assert(xspans.test(b, [5, 6, 9,10]) === kTestPart);
    assert(xspans.test(b, [0, 11]     ) === kTestPart);
  });

  it("should test `test` functionality with more data.", function() {
    var a = [];
    var i;

    for (i = 0; i < 1000; i += 2)
      a.push(i, i + 1);

    for (i = 0; i < 1000; i += 2)
      assert(xspans.test(a, i + 0.5) === kTestFull);

    for (i = 0; i < 1000; i += 2)
      assert(xspans.test(a, i + 1.0) === kTestNone);

    for (i = 0; i < 1000; i += 2)
      assert(xspans.test(a, i - 0.1) === kTestNone);

    assert(xspans.test(a, a.slice(2, a.length - 2)) === kTestFull);
  });

  it("should test `shift` functionality.", function() {
    var a = [0, 1];
    var b = [0, 1, 10, 1000];

    assert(xspans.shift(a, 0).equals(a));
    assert(xspans.shift(a, 1).equals([ 1, 2]));
    assert(xspans.shift(a,-1).equals([-1, 0]));

    assert(xspans.shift(b, 0).equals(b));
    assert(xspans.shift(b, 1).equals([ 1, 2, 11, 1001]));
    assert(xspans.shift(b,-1).equals([-1, 0,  9,  999]));

    // Rounding.
    assert(xspans.shift([0, 0.999, 1, 2], 9007199254740992).equals([9007199254740992, 9007199254740994]));

    // NaN.
    assert(xspans.shift([0, 1], NaN).equals([]));
  });

  it("should test `scale` functionality.", function() {
    var a = [0, 1];
    var b = [0, 1, 10, 1000];

    assert(xspans.scale(a, 0).equals([]));
    assert(xspans.scale(b, 0).equals([]));

    assert(xspans.scale(a, 1).equals(a));
    assert(xspans.scale(b, 1).equals(b));

    assert(xspans.scale(a, 2).equals([0, 2]));
    assert(xspans.scale(b, 2).equals([0, 2, 20, 2000]));

    // NaN.
    assert(xspans.scale([0, 1], NaN).equals([]));
  });

  it("should test `union` functionality #1.", function() {
    var a = [0, 1, 10, 11, 20, 21];
    var b = [1, 2, 11, 12, 21, 22];
    var c = [2, 3, 12, 13, 22, 23];
    var d = [3, 4, 13, 14, 23, 24];

    var empty = [];
    assert(xspans.union(empty, empty).equals(empty));

    assert(xspans.union(a, empty).equals(a));
    assert(xspans.union(empty, a).equals(a));

    assert(xspans.union(a, b).equals([0, 2, 10, 12, 20, 22]));
    assert(xspans.union(a, b, c).equals([0, 3, 10, 13, 20, 23]));

    assert(xspans.union(a, b, c, d).equals([0, 4, 10, 14, 20, 24]));
    assert(xspans.union(a, c, b, d).equals([0, 4, 10, 14, 20, 24]));
    assert(xspans.union(a, d, c, b).equals([0, 4, 10, 14, 20, 24]));

    var e = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    var f = [-1000, 1000];

    assert(xspans.union(e, f).equals(f));
    assert(xspans.union(f, e).equals(f));
  });

  it("should test `union` functionality #2.", function() {
    var a = xspans();

    a.union([0, 1]);
    assert(a.equals([0, 1]));

    a.union([1, 2]);
    assert(a.equals([0, 2]));
  });

  it("should test `intersect` functionality #1.", function() {
    var a = [0, 2, 10, 12, 20, 22];
    var b = [1, 3, 11, 13, 21, 23];
    var c = [2, 4, 12, 14, 22, 24];

    var empty = [];
    assert(xspans.intersect(empty, empty).equals(empty));

    assert(xspans.intersect(a, empty).equals(empty));
    assert(xspans.intersect(empty, a).equals(empty));

    assert(xspans.intersect(a, b).equals([1, 2, 11, 12, 21, 22]));
    assert(xspans.intersect(b, a).equals([1, 2, 11, 12, 21, 22]));

    assert(xspans.intersect(b, c).equals([2, 3, 12, 13, 22, 23]));
    assert(xspans.intersect(c, b).equals([2, 3, 12, 13, 22, 23]));

    assert(xspans.intersect(a, c).equals(empty));
    assert(xspans.intersect(c, a).equals(empty));

    var e = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    var f = [-1000, 1000];

    assert(xspans.intersect(e, f).equals(e));
    assert(xspans.intersect(f, e).equals(e));
  });

  it("should test `intersect` functionality #2.", function() {
    var a = xspans([0, 9]);

    a.intersect([0, 1, 5, 9]);
    assert(a.equals([0, 1, 5, 9]));
  });

  it("should test `xor` functionality.", function() {
    var a = [0, 1, 2, 3, 4, 5, 6, 7];
    var b = [1, 2, 3, 4, 5, 6, 7, 8];
    var c = [0, 8];

    var empty = [];
    assert(xspans.xor(empty, empty).equals(empty));

    assert(xspans.xor(a, empty).equals(a));
    assert(xspans.xor(empty, a).equals(a));

    assert(xspans.xor(a, a).equals(empty));
    assert(xspans.xor(b, b).equals(empty));
    assert(xspans.xor(c, c).equals(empty));

    assert(xspans.xor(a, b).equals([0, 8]));
    assert(xspans.xor(b, a).equals([0, 8]));

    assert(xspans.xor(a, c).equals([1, 2, 3, 4, 5, 6, 7, 8]));
    assert(xspans.xor(b, c).equals([0, 1, 2, 3, 4, 5, 6, 7]));

    assert(xspans.xor(a, b, b).equals(a));
    assert(xspans.xor(b, a, a).equals(b));

    assert(xspans.xor(a, c, c).equals(a));
    assert(xspans.xor(c, a, a).equals(c));
  });

  it("should test `sub` functionality.", function() {
    var a = [0, 1, 2, 3, 4, 5, 6, 7];
    var b = [1, 2, 3, 4, 5, 6, 7, 8];
    var c = [0, 8];

    var empty = [];
    assert(xspans.sub(empty, empty).equals(empty));

    assert(xspans.sub(a, empty).equals(a));
    assert(xspans.sub(empty, a).equals(empty));

    assert(xspans.sub(a, a).equals(empty));
    assert(xspans.sub(b, b).equals(empty));
    assert(xspans.sub(c, c).equals(empty));

    assert(xspans.sub(a, b).equals(a));
    assert(xspans.sub(b, a).equals(b));

    assert(xspans.sub(a, c).equals(empty));
    assert(xspans.sub(b, c).equals(empty));

    assert(xspans.sub(c, a).equals(b));
    assert(xspans.sub(c, b).equals(a));

    var d = [0, 4,  8, 12];
    var e = [2, 6, 10, 14];

    assert(xspans.sub(d, e).equals([0, 2, 8, 10]));
    assert(xspans.sub(e, d).equals([4, 6, 12, 14]));

    var f = [2, 3, 5, 6, 8, 11];
    var g = [2, 11, 12, 13];

    assert(xspans.sub(f, g).equals([]));
    assert(xspans.sub(g, f).equals([3, 5, 6, 8, 12, 13]));

    assert(xspans.sub(a, f).equals([0, 1, 4, 5, 6, 7]));
    assert(xspans.sub(b, f).equals([1, 2, 3, 4, 7, 8]));
  });
});
