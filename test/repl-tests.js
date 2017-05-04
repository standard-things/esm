const assert = require("assert");

module.id = "<repl>";

describe("Node REPL", () => {
  import "../repl";
  import { createContext } from "vm";
  import { enable } from "../lib/runtime.js";
  import repl from "repl";

  it("should work with global context", (done) => {
    const r = repl.start({ useGlobal: true });
    enable(r.context.module);

    assert.strictEqual(typeof assertStrictEqual, "undefined");

    r.eval(
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
    const r = repl.start({ useGlobal: false });
    const context = createContext({ module });

    r.eval(
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
