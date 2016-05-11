var assert = require("assert");

describe("import statements", function () {
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

  it("should allow named re-exports", function test() {
    import { a, c, v, si } from "./export-some.js";
    assert.strictEqual(a, "a");
    assert.strictEqual(c(), "c");
    assert.strictEqual(v, "b");
    assert.strictEqual(si, "cee");
  });

  it("should be able to contain import statements", function () {
    import { outer } from "./nested";
    assert.deepEqual(outer(), ["a", "b", "c"]);
  });
});

describe("built-in modules", function () {
  it("should fire setters if already loaded", function () {
    // The "module" module is required in ../lib/node.js before we begin
    // compiling anything.
    import { Module as M } from "module";
    assert.ok(module instanceof M);
  });
});

describe("compiler", function () {
  it("should not get confused by string literals", function () {
    assert.strictEqual(
      'a; import b from "c"; d',
      'a; import b ' + 'from "c"; d'
    );

    assert.strictEqual(
      'a; export {a} from "a"; b;',
      'a; export {a' + '} from "a"; b;'
    );
  });

  it("should not be enabled for nested node_modules", function () {
    var threw = true;
    try {
      import "disabled";
      threw = false;
    } catch (e) {
      assert.ok(e instanceof SyntaxError);
      assert.ok(/unexpected/i.test(e.message));
    }
    assert.strictEqual(threw, true);
  });

  it("should be enabled for packages that depend on reify", function () {
    import a from "enabled";
    assert.strictEqual(a, assert);
  });

  it("should preserve line numbers", function () {
    import check from "./lines.js";
    check();
  });
});

describe("Node REPL", function () {
  import { createContext } from "vm";

  it("should work with global context", function (done) {
    var repl = require("repl").start({
      useGlobal: true
    });

    assert.strictEqual(typeof assertStrictEqual, "undefined");

    repl.eval(
      'import { strictEqual as assertStrictEqual } from "assert"',
      null, // context
      "repl", // filename
      function (err, result) {
        // Use the globally-defined assertStrictEqual to test itself!
        assertStrictEqual(typeof assertStrictEqual, "function");
        done();
      }
    );
  });

  it("should work with non-global context", function (done) {
    var repl = require("repl").start({
      useGlobal: false
    });

    var context = createContext({
      module: module
    });

    repl.eval(
      'import { strictEqual } from "assert"',
      context,
      "repl", // filename
      function (err, result) {
        // Use context.strictEqual to test itself!
        context.strictEqual(typeof context.strictEqual, "function");
        done();
      }
    );
  });
});
