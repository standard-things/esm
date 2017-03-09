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
});
