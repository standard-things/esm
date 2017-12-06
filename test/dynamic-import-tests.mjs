import Compiler from "../build/compiler.js"

import assert from "assert"
import createNamespace from "./create-namespace.js"
import path from "path"

const compile = Compiler.compile
const isWin = process.platform === "win32"

const abcId = "./fixture/export/abc.mjs"
const abcNs = createNamespace({
  a: "a",
  b: "b",
  c: "c",
  default: "default"
})

describe("dynamic import", () => {
  it("should establish live binding of values", () =>
    import("./fixture/live.mjs").then((ns) => {
      ns.reset()
      assert.strictEqual(ns.value, 0)

      ns.add(2)
      ns.add(2)
      assert.strictEqual(ns.value, 4)

      assert.strictEqual(ns.reset(), 0)
      assert.strictEqual(ns.value, 0)
    })
  )

  it("should support a variable id", () =>
    import(abcId)
      .then((ns) => assert.deepStrictEqual(ns, abcNs))
  )

  it("should support a template string id", () =>
    import(`${abcId}`)
      .then((ns) => assert.deepStrictEqual(ns, abcNs))
  )

  it("should support an expression id", () =>
    import((() => abcId)())
      .then((ns) => assert.deepStrictEqual(ns, abcNs))
  )

  it("should support the file protocol", () =>
    import("file:" + (isWin ? "///" : "//") + path.resolve(abcId))
      .then((ns) => assert.deepStrictEqual(ns, abcNs))
  )

  it("should support whitespace between `import`, `(`, and `)`", () =>
    import
    // eslint-disable-next-line no-unexpected-multiline
    (
    "./fixture/export/abc.mjs"
    )

      .then((ns) => assert.deepStrictEqual(ns, abcNs))
  )

  it("should support `import()` in an initial assignment", () => {
    const p = import("./fixture/export/abc.mjs")
    assert.ok(p instanceof Promise)
  })

  it("should support `import()` in a reassignment", () => {
    let p
    p = import("./fixture/export/abc.mjs")
    assert.ok(p instanceof Promise)
  })

  it("should support `import()` in call expression", () => {
    assert.ok(import("./fixture/export/abc.mjs") instanceof Promise)
  })

  it("should support `import()` in a class", () => {
    class P {
      constructor() {
        return import("./fixture/export/abc.mjs")
      }
    }

    assert.ok(new P instanceof Promise)
  })

  it("should support `import()` in a function", () => {
    function p() {
      return import("./fixture/export/abc.mjs")
    }

    assert.ok(p() instanceof Promise)
  })

  it("should support `import()` with yield", () => {
    function* p() {
      yield import("./fixture/export/abc.mjs")
    }

    assert.ok(p())
  })

  it("should expect exactly one argument", () => {
    const invalids = [
      "import()",
      "import(a,b)",
      "import(...[a])",
      "import.then()",
      "import.call(a,b)"
    ]

    invalids.forEach((code) =>
      assert.throws(() => compile(code), SyntaxError)
    )
  })
})
