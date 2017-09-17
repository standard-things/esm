import Runtime from "../build/runtime.js"

import assert from "assert"
import module from "./fixture/repl/module.mjs"
import repl from "repl"
import vm from "vm"

const context = vm.createContext({ module })

describe("REPL hook", () => {
  it("should work with a non-global context", (done) => {
    const r = repl.start({})

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

  it("should recover from import errors", (done) => {
    const r = repl.start({
      eval(code, callback) {
        let error = null

        try {
          vm.createScript(code)
            .runInContext(context, { displayErrors: false })
        } catch (e) {
          error = e
        }

        callback(error)
      }
    })

    r.eval('import { bogus } from "path"', (e) => {
      assert.ok(e.message.includes("' does not provide an export named '"))

      r.eval('import { join } from "path"', (e) => {
        assert.strictEqual(e, null)
        done()
      })
    })
  })

  it("should work with a global context", (done) => {
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
})
