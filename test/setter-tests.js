const assert = require("assert");

describe("module.runModuleSetters", () => {
  it("should be called after eval(...)", () => {
    import { value, run } from "./setter/eval";

    assert.strictEqual(value, "original");
    const result = run('localValue = "modified"');
    assert.strictEqual(value, result);
    assert.strictEqual(value, "modified");
  });
});

describe("parent setters", () => {
  it("should be run when children update exports", () => {
    import { c } from "./setter/parent";
    import { increment } from "./setter/grandchild";

    assert.strictEqual(c, 0);
    increment();
    assert.strictEqual(c, 1);
  });

  it("should not be called if replaced", () => {
    import { value, reset, add } from "./live.js";

    let firstCallCount = 0;
    let secondCallCount = 0;

    module.importSync("./live.js", {
      value: (v) => {
        ++firstCallCount;
        value = "first:" + v;
      }
    }, "key");

    assert.strictEqual(firstCallCount, 1);
    assert.strictEqual(value, "first:0");
    add(3);
    assert.strictEqual(firstCallCount, 2);
    assert.strictEqual(value, "first:3");
    assert.strictEqual(secondCallCount, 0);

    module.importSync("./live.js", {
      value: (v) => {
        ++secondCallCount;
        value = "second:" + v;
      }
    }, "key");

    assert.strictEqual(firstCallCount, 2);
    assert.strictEqual(secondCallCount, 1);
    assert.strictEqual(value, "second:3");
    add(4);
    assert.strictEqual(firstCallCount, 2);
    assert.strictEqual(secondCallCount, 2);
    assert.strictEqual(value, "second:7");
  });
});
