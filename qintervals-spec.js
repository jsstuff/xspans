// qintervals <https://github.com/exjs/qintervals>
"use strict"

var assert = require("assert");
var qintervals = require("./qintervals");

describe("IntervalOps", function() {
  var kTestNone = qintervals.kTestNone;
  var kTestFull = qintervals.kTestFull;
  var kTestPart = qintervals.kTestPart;

  it("should wrap packed values if they are well-formed.", function() {
    var packed;

    packed = [];
    assert(qintervals.wrap(packed).getData() === packed);

    packed = [1, 2];
    assert(qintervals.wrap(packed).getData() === packed);

    packed = [1, 2, 4, 5, 10, 19, 20, 24];
    assert(qintervals.wrap(packed).getData() === packed);
  });

  it("should sanity ill-formed packed arguments.", function() {
    assert(qintervals.equals([1, 2, 2, 3], [1, 3]));
    assert(qintervals.equals([2, 3, 1, 2], [1, 3]));
    assert(qintervals.equals([3, 4, 1, 2], [1, 2, 3, 4]));
    assert(qintervals.equals([1, 2, 3, 4, -1, 5], [-1, 5]));
  });

  it("should convert from array of objects.", function() {
    var data;

    data = [
      { from: 1, to: 2 },
      { from: 4, to: 5 }
    ];
    assert(qintervals(data).equals([1, 2, 4, 5]));

    data = [
      { from: 4, to: 5 },
      { from: 1, to: 2 }
    ];
    assert(qintervals(data).equals([1, 2, 4, 5]));


    data = [
      { from: 1, to: 2 },
      { from: 2, to: 3 }
    ];
    assert(qintervals(data).equals([1, 3]));

    data = [
      { from: 1, to: 2 },
      { from: 2, to: 3 },
      { from: 5, to: 6 },
      { from: 6, to: 8 },
      { from:-1, to: 10}
    ];
    assert(qintervals(data).equals([-1, 10]));
  });

  it("should test `test` functionality.", function() {
    var a = [0, 1];
    var b = [0, 1, 5, 6, 10, 11];

    assert(qintervals.test(a, []) === kTestNone);
    assert(qintervals.test(b, []) === kTestNone);

    assert(qintervals.test(a, a) === kTestFull);
    assert(qintervals.test(b, b) === kTestFull);

    assert(qintervals.test(a, 0.0) === kTestFull);
    assert(qintervals.test(a, 0.5) === kTestFull);
    assert(qintervals.test(a, 1.0) === kTestNone); // Not part of interval.

    assert(qintervals.test(a, [ 0, 0.5]) === kTestFull);
    assert(qintervals.test(a, [ 0, 1.0]) === kTestFull);
    assert(qintervals.test(a, [ 0, 1.5]) === kTestPart);
    assert(qintervals.test(a, [-1, 1.0]) === kTestPart);
    assert(qintervals.test(a, [ 1, 1.5]) === kTestNone);

    assert(qintervals.test(b, [0, 1]      ) === kTestFull);
    assert(qintervals.test(b, [0, 1, 5, 6]) === kTestFull);
    assert(qintervals.test(b, [5, 6, 9,10]) === kTestPart);
    assert(qintervals.test(b, [0, 11]     ) === kTestPart);
  });

  it("should test `test` functionality with more data.", function() {
    var a = [];
    var i;

    for (i = 0; i < 1000; i += 2)
      a.push(i, i + 1);

    for (i = 0; i < 1000; i += 2)
      assert(qintervals.test(a, i + 0.5) === kTestFull);

    for (i = 0; i < 1000; i += 2)
      assert(qintervals.test(a, i + 1.0) === kTestNone);

    for (i = 0; i < 1000; i += 2)
      assert(qintervals.test(a, i - 0.1) === kTestNone);

    assert(qintervals.test(a, a.slice(2, a.length - 2)) === kTestFull);
  });

  it("should test shift functionality.", function() {
    var a = [0, 1];
    var b = [0, 1, 10, 1000];

    assert(qintervals.shift(a, 0).equals(a));
    assert(qintervals.shift(a, 1).equals([ 1, 2]));
    assert(qintervals.shift(a,-1).equals([-1, 0]));

    assert(qintervals.shift(b, 0).equals(b));
    assert(qintervals.shift(b, 1).equals([ 1, 2, 11, 1001]));
    assert(qintervals.shift(b,-1).equals([-1, 0,  9,  999]));
  });

  it("should test union functionality #1.", function() {
    var a = [0, 1, 10, 11, 20, 21];
    var b = [1, 2, 11, 12, 21, 22];
    var c = [2, 3, 12, 13, 22, 23];
    var d = [3, 4, 13, 14, 23, 24];

    var empty = [];
    assert(qintervals.union(empty, empty).equals(empty));

    assert(qintervals.union(a, empty).equals(a));
    assert(qintervals.union(empty, a).equals(a));

    assert(qintervals.union(a, b).equals([0, 2, 10, 12, 20, 22]));
    assert(qintervals.union(a, b, c).equals([0, 3, 10, 13, 20, 23]));

    assert(qintervals.union(a, b, c, d).equals([0, 4, 10, 14, 20, 24]));
    assert(qintervals.union(a, c, b, d).equals([0, 4, 10, 14, 20, 24]));
    assert(qintervals.union(a, d, c, b).equals([0, 4, 10, 14, 20, 24]));

    var e = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    var f = [-1000, 1000];

    assert(qintervals.union(e, f).equals(f));
    assert(qintervals.union(f, e).equals(f));
  });

  it("should test union functionality #2.", function() {
    var a = qintervals();

    a.union([0, 1]);
    assert(a.equals([0, 1]));

    a.union([1, 2]);
    assert(a.equals([0, 2]));
  });

  it("should test intersect functionality #1.", function() {
    var a = [0, 2, 10, 12, 20, 22];
    var b = [1, 3, 11, 13, 21, 23];
    var c = [2, 4, 12, 14, 22, 24];

    var empty = [];
    assert(qintervals.intersect(empty, empty).equals(empty));

    assert(qintervals.intersect(a, empty).equals(empty));
    assert(qintervals.intersect(empty, a).equals(empty));

    assert(qintervals.intersect(a, b).equals([1, 2, 11, 12, 21, 22]));
    assert(qintervals.intersect(b, a).equals([1, 2, 11, 12, 21, 22]));

    assert(qintervals.intersect(b, c).equals([2, 3, 12, 13, 22, 23]));
    assert(qintervals.intersect(c, b).equals([2, 3, 12, 13, 22, 23]));

    assert(qintervals.intersect(a, c).equals(empty));
    assert(qintervals.intersect(c, a).equals(empty));

    var e = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    var f = [-1000, 1000];

    assert(qintervals.intersect(e, f).equals(e));
    assert(qintervals.intersect(f, e).equals(e));
  });

  it("should test intersect functionality #2.", function() {
    var a = qintervals([0, 9]);

    a.intersect([0, 1, 5, 9]);
    assert(a.equals([0, 1, 5, 9]));
  });

  it("should test xor functionality.", function() {
    var a = [0, 1, 2, 3, 4, 5, 6, 7];
    var b = [1, 2, 3, 4, 5, 6, 7, 8];
    var c = [0, 8];

    var empty = [];
    assert(qintervals.xor(empty, empty).equals(empty));

    assert(qintervals.xor(a, empty).equals(a));
    assert(qintervals.xor(empty, a).equals(a));

    assert(qintervals.xor(a, a).equals(empty));
    assert(qintervals.xor(b, b).equals(empty));
    assert(qintervals.xor(c, c).equals(empty));

    assert(qintervals.xor(a, b).equals([0, 8]));
    assert(qintervals.xor(b, a).equals([0, 8]));

    assert(qintervals.xor(a, c).equals([1, 2, 3, 4, 5, 6, 7, 8]));
    assert(qintervals.xor(b, c).equals([0, 1, 2, 3, 4, 5, 6, 7]));

    assert(qintervals.xor(a, b, b).equals(a));
    assert(qintervals.xor(b, a, a).equals(b));

    assert(qintervals.xor(a, c, c).equals(a));
    assert(qintervals.xor(c, a, a).equals(c));
  });

  it("should test sub functionality.", function() {
    var a = [0, 1, 2, 3, 4, 5, 6, 7];
    var b = [1, 2, 3, 4, 5, 6, 7, 8];
    var c = [0, 8];

    var empty = [];
    assert(qintervals.sub(empty, empty).equals(empty));

    assert(qintervals.sub(a, empty).equals(a));
    assert(qintervals.sub(empty, a).equals(empty));

    assert(qintervals.sub(a, a).equals(empty));
    assert(qintervals.sub(b, b).equals(empty));
    assert(qintervals.sub(c, c).equals(empty));

    assert(qintervals.sub(a, b).equals(a));
    assert(qintervals.sub(b, a).equals(b));

    assert(qintervals.sub(a, c).equals(empty));
    assert(qintervals.sub(b, c).equals(empty));

    assert(qintervals.sub(c, a).equals(b));
    assert(qintervals.sub(c, b).equals(a));

    var d = [0, 4,  8, 12];
    var e = [2, 6, 10, 14];

    assert(qintervals.sub(d, e).equals([0, 2, 8, 10]));
    assert(qintervals.sub(e, d).equals([4, 6, 12, 14]));

    var f = [2, 3, 5, 6, 8, 11];
    var g = [2, 11, 12, 13];

    assert(qintervals.sub(f, g).equals([]));
    assert(qintervals.sub(g, f).equals([3, 5, 6, 8, 12, 13]));

    assert(qintervals.sub(a, f).equals([0, 1, 4, 5, 6, 7]));
    assert(qintervals.sub(b, f).equals([1, 2, 3, 4, 7, 8]));
  });
});
