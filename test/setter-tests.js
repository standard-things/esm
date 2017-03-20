var assert = require("assert");

describe("module.runModuleSetters", function () {
  it("should be called after eval(...)", function () {
    import { value, run } from "./eval";
    assert.strictEqual(value, "original");
    var result = run('localValue = "modified"');
    assert.strictEqual(value, result);
    assert.strictEqual(value, "modified");
  });
});

describe("parent setters", function () {
  it("should be run when children update exports", function () {
    import { c } from "./setters/parent";
    import { increment } from "./setters/grandchild";
    assert.strictEqual(c, 0);
    increment();
    assert.strictEqual(c, 1);
  });

  it("should not be called if replaced", function () {
    import { value, reset, add } from "./live.js";

    var firstCallCount = 0;
    var secondCallCount = 0;

    module.importSync("./live.js", {
      value: function (v) {
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
      value: function (v) {
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
