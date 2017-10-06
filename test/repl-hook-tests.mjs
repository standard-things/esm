import Runtime from "../build/runtime.js"

import assert from "assert"
import module from "./module.js"
import path from "path"
import repl from "repl"
import require from "./require.js"
import vm from "vm"

const isWin = process.platform === "win32"

const __filename = import.meta.url.slice(isWin ? 8 : 7)
const __dirname = path.dirname(__filename)

const pkgPath = path.resolve(__dirname, "../index.js")
const parent = require.cache[pkgPath].parent
const pkgIndex = parent.children.findIndex((child) => child.filename === pkgPath)

describe("REPL hook", () => {
  let context

  before(() => {
    context = vm.createContext({ module: new module.constructor("<repl>") })

    delete require.cache[pkgPath]
    context.module.require(pkgPath)

    delete require.cache[pkgPath]
    parent.children.splice(pkgIndex, 1)
    parent.require(pkgPath)
  })

  it("should work with a global context", () => {
    const r = repl.start({ useGlobal: true })
    const code = 'import { default as globalAssert } from "assert"'

    r.context.module.exports = {}
    Runtime.enable(r.context.module)

    assert.strictEqual(typeof globalAssert, "undefined")

    r.eval(code, null, "repl", () =>
      assert.strictEqual(typeof globalAssert, "function")
    )

    r.close()
  })

  it("should work with a non-global context", () => {
    const r = repl.start({})
    const code = 'import { default as localAssert } from "assert"'

    assert.strictEqual(typeof context.localAssert, "undefined")

    r.eval(code, context, "repl", () =>
      assert.strictEqual(typeof context.localAssert, "function")
    )

    r.close()
  })

  it("should use a plain object for `module.exports`", () => {
    const r = repl.start({})
    const code = "this.exports = module.exports"

    r.eval(code, context, "repl", () =>
      assert.strictEqual(Object.getPrototypeOf(context.exports), Object.prototype)
    )

    r.close()
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

    r.eval('import { bogus } from "path"', (error1) => {
      r.eval('import { join } from "path"', (error2) => {
        assert.ok(error1.message.includes("' does not provide an export named '"))
        assert.strictEqual(error2, null)
      })

      setImmediate(() => {
        r.close()
        done()
      })
    })
  })
})
