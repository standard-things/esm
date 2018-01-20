import Compiler from "../build/compiler.js"

import assert from "assert"
import createNamespace from "./create-namespace.js"
import path from "path"
import require from "./require.js"
import url from "url"

const isWin = process.platform === "win32"
const fileProtocol = "file://" + (isWin ? "/" : "")

const abcPath = require.resolve("./fixture/export/abc.mjs")
const abcURL = fileProtocol + abcPath.replace(/\\/g, "/")
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

  it("should accept a variable", () =>
    import(abcPath)
      .then((ns) => assert.deepStrictEqual(ns, abcNs))
  )

  it("should accept a template string", () =>
    import(`${abcPath}`)
      .then((ns) => assert.deepStrictEqual(ns, abcNs))
  )

  it("should accept an expression", () =>
    import((() => abcPath)())
      .then((ns) => assert.deepStrictEqual(ns, abcNs))
  )

  it("should support the file protocol", () =>
    import(abcURL)
      .then((ns) => assert.deepStrictEqual(ns, abcNs))
  )

  it("should coerce specifier to a string", () => {
    const parsed = url.parse(abcURL)
    parsed.toString = () => parsed.href

    return import(parsed)
      .then((ns) => assert.deepStrictEqual(ns, abcNs))
  })

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

  it("should be syntactic", () =>
    [
      "const f = import",
      "import.length",
      "import.name",
      "import.apply()",
      "import.call()",
      "import.toString()"
    ]
    .forEach((code) => {
      assert.throws(() => Compiler.compile(code), SyntaxError)
    })
  )

  it("should accept exactly one argument", () =>
    [
      "import()",
      "import(a,b)",
      "import(...[a])"
    ]
    .forEach((code) => {
      assert.throws(() => Compiler.compile(code), SyntaxError)
    })
  )
})
