import Runtime from "../build/runtime.js"

import assert from "assert"
import module from "./repl/module.js"
import repl from "repl"
import vm from "vm"

describe("REPL", () => {
  it("should work with global context", (done) => {
    const r = repl.start({ useGlobal: true })

    r.context.module.exports = {}
    Runtime.enable(r.context.module)

    assert.strictEqual(typeof globalAssert, "undefined")

    r.eval(
      'import { default as globalAssert } from "assert"',
      null, // Context.
      "repl",
      () => {
        /* global assertStrictEqual: false */
        assert.strictEqual(typeof globalAssert, "function")
        done()
      }
    )
  })

  it("should work with non-global context", (done) => {
    const r = repl.start({ useGlobal: false })
    const context = vm.createContext({ module })

    module.exports = {}
    Runtime.enable(module)

    r.eval(
      'import { default as localAssert } from "assert"',
      context,
      "repl",
      () => {
        assert.strictEqual(typeof context.localAssert, "function")
        done()
      }
    )
  })
})
