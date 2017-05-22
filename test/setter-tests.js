import assert from "assert";
import { join as pathJoin } from "path";

describe("module.runSetters", () => {
  it("should be called after eval(...)", () => {
    import { value, run } from "./setter/eval";

    assert.strictEqual(value, "original");
    const result = run('localValue = "modified"');
    assert.strictEqual(value, result);
    assert.strictEqual(value, "modified");
  });

  it("should be called for untouched CJS modules, too", () => {
    // Import the CommonJS module first, but do not register any setters.
    import "./setter/cycle/cjs.js";
    import { getSum } from "./setter/cycle/esm.js";
    assert.strictEqual(getSum(), 3);
  });
});

describe("bridge modules", () => {
  it("should not prematurely seal * exports", () => {
    import { bridge } from "./setter/cycle/bridge-owner.js";

    assert.strictEqual(
      bridge.name,
      pathJoin(__dirname, "setter/cycle/bridge-owner.js")
    );

    assert.strictEqual(bridge, bridge.bridge);
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
    import { value, reset, add } from "./misc/live.js";

    let firstCallCount = 0;
    let secondCallCount = 0;

    reset();
    module.importSync("./misc/live.js", {
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

    module.importSync("./misc/live.js", {
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

  it("should only be discarded if getter did not throw", () => {
    // Manually register setters for value and set, which are marked as
    // constant in the fake-const.js module, even though they are actually
    // mutable (see below).
    let value, set;
    let valueSetterCallCount = 0;
    module.watch(require("./setter/fake-const.js"), {
      value: v => {
        value = v;
        valueSetterCallCount += 1;
      },
      set: v => set = v
    });

    // Because the getter for value in fake-const.js throws, the initial
    // value here is undefined, and our live binding to that value is
    // maintained for now.
    assert.strictEqual(value, void 0);
    assert.strictEqual(valueSetterCallCount, 1);

    // Since the exported value is marked as constant, the setter that
    // updates our copy of value should be discarded as soon as it has
    // been called with the final value, but this set(2) still works
    // because the getter threw the last time it was called. After this,
    // however, the setter function will be discarded.
    set(2);
    assert.strictEqual(value, 2);
    assert.strictEqual(valueSetterCallCount, 2);

    // Because the exported value is marked as constant, this set(3) is
    // not reflected in this scope, because the setter that we registered
    // above has been thrown away.
    set(3);
    assert.strictEqual(value, 2);
    assert.strictEqual(valueSetterCallCount, 2);
  });
});
