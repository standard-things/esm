const assert = require("assert");

describe("spec compliance", () => {
  it("should have a top-level `this` of `undefined`", () => {
    import value from "./misc/this";
    assert.strictEqual(value, void 0);
  });

  it("should establish live binding of values", () => {
    import { value, reset, add } from "./misc/live";
    reset();
    assert.strictEqual(value, 0);
    add(2);
    assert.strictEqual(value, 2);
  });

  it("should execute modules in the correct order", () => {
    import { getLog } from "./misc/order-tracker";
    import "./misc/order-c";
    assert.deepEqual(getLog(), ["a", "b", "c"]);
  });

  it("should bind exports before the module executes", () => {
    import value from "./export/cycle-a";
    assert.strictEqual(value, true);
  });
});

describe("built-in modules", () => {
  it("should fire setters if already loaded", () => {
    // The "module" module is required in ../lib/node.js before we begin
    // compiling anything.
    import { Module as M } from "module";
    assert.ok(module instanceof M);
  });
});
