var assert = require("assert");

describe("import declarations", function () {
  it("should work in nested scopes", function () {
    import { name, id } from "./name";
    assert.strictEqual(name, "name.js");
    assert.strictEqual(id.split("/").pop(), "name.js");
  });

  it("should cope with dependency cycles", function () {
    import { check as aCheck } from "./cycle-a";
    aCheck();

    import { check as bCheck } from "./cycle-a";
    bCheck();
  });

  it("should support combinations of import styles", function () {
    import * as abc1 from "./abc";
    import abc2, * as abc3 from "./abc";
    import { default as abc4 } from "./abc";
    import abc5, { a as ay, b as bee, c } from "./abc";

    assert.deepEqual(abc1, {
      a: "a",
      b: "b",
      c: "c"
    });

    assert.deepEqual(abc1, abc2);
    assert.deepEqual(abc1, abc3);
    assert.deepEqual(abc1, abc4);
    assert.deepEqual(abc1, abc5);
  });

  it("should import module.exports as default, by default", function () {
    import def from "./export/common.js";
    assert.strictEqual(def, "pure CommonJS");
  });

  it("should allow same symbol as different locals", function () {
    import { a as x, a as y } from "./abc";
    assert.strictEqual(x, "a");
    assert.strictEqual(y, "a");
  });

  it("should support braceless-if nested imports", function () {
    assert.strictEqual(typeof x, "undefined");
    for (var i = 0; i < 3; ++i) {
      if (i === 0) import { a as x } from "./abc";
      else if (i === 1) import { b as x } from "./abc";
      else import { c as x } from "./abc";
      assert.strictEqual(x, ["a", "b", "c"][i]);
    }
    assert.strictEqual(x, "c");
  });
});
