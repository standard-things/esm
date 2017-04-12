const assert = require("assert");

describe("Node REPL", () => {
  import { createContext } from "vm";
  import "../repl";

  it("should work with global context", (done) => {
    const repl = require("repl").start({
      useGlobal: true
    });

    assert.strictEqual(typeof assertStrictEqual, "undefined");

    repl.eval(
      'import { strictEqual as assertStrictEqual } from "assert"',
      null, // Context
      "repl", // Filename
      (err, result) => {
        // Use the globally-defined assertStrictEqual to test itself!
        assertStrictEqual(typeof assertStrictEqual, "function");
        done();
      }
    );
  });

  it("should work with non-global context", (done) => {
    const repl = require("repl").start({
      useGlobal: false
    });

    const context = createContext({
      module: module
    });

    repl.eval(
      'import { strictEqual } from "assert"',
      context,
      "repl", // Filename
      (err, result) => {
        // Use context.strictEqual to test itself!
        context.strictEqual(typeof context.strictEqual, "function");
        done();
      }
    );
  });
});
