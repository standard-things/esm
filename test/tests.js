var assert = require("assert");

describe("import statements", function () {
  it("should work in nested scopes", function () {
    import { name, id } from "./name";
    assert.strictEqual(name, "name.js");
    assert.strictEqual(id.split("/").pop(), "name.js");
  });
});

describe("export statements", function () {
  it("should allow * exports", function () {
    import Default, {
      a, b, c as d,
    } from "./export-all.js";

    assert.strictEqual(a, "a");
    assert.strictEqual(b, "b");
    assert.strictEqual(d, "c");

    assert.deepEqual(Default, {
      a: "a",
      b: "b",
      c: "c"
    });
  });
});
