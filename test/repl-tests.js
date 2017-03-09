var assert = require("assert");

describe("Node REPL", function () {
  import { createContext } from "vm";
  import "../repl";

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
