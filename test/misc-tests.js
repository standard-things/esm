const assert = require("assert");

describe("spec compliance", () => {
  it("should establish live binding of values", () => {
    import { value, reset, add } from "./live";
    reset();
    assert.equal(value, 0);
    add(2);
    assert.equal(value, 2);
  });

  it("should execute modules in the correct order", () => {
    import { getLog } from "./order-tracker";
    import "./order-c";
    assert.deepEqual(getLog(), ["a", "b", "c"]);
  });

  it("should bind exports before the module executes", () => {
    import value from "./export/cycle-a";
    assert.equal(value, true);
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
