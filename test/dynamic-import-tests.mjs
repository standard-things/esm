
import Compiler from "../build/compiler.js"

import assert from "assert"
import createNamespace from "./create-namespace.js"
import path from "path"
import url from "url"

const isWin = process.platform === "win32"

const fileProtocol = "file://" + (isWin ? "/" : "")

const abcPath = path.resolve("fixture/export/abc.mjs")
const abcURL = fileProtocol + abcPath.replace(/\\/g, "/")
const abcNs = createNamespace({
  a: "a",
  b: "b",
  c: "c",
  default: "default"
})

function assertAbcNs(ns) {
  assert.deepStrictEqual(ns, abcNs)
}

describe("dynamic import tests", () => {
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
      .then(assertAbcNs)
  )

  it("should accept a template string", () =>
    import(`${abcPath}`)
      .then(assertAbcNs)
  )

  it("should accept an expression", () =>
    import((() => abcPath)())
      .then(assertAbcNs)
  )

  it("should support the file protocol", () =>
    import(abcURL)
      .then(assertAbcNs)
  )

  it("should coerce specifier to a string", () => {
    const { URL } = url

    let parsed

    if (URL) {
      parsed = new URL(abcURL)
    } else {
      parsed = url.parse(abcURL)
      parsed.toString = () => parsed.href
    }

    return import(parsed)
      .then(assertAbcNs)
  })

  it("should support `import()` in an initial assignment", () => {
    const p = import("./fixture/export/abc.mjs")

    return p
      .then(assertAbcNs)
  })

  it("should support `import()` in a reassignment", () => {
    let p

    p = import("./fixture/export/abc.mjs")

    return p
      .then(assertAbcNs)
  })

  it("should support `import()` in a call expression", () => {
    function identity(value) {
      return value
    }

    return identity(import("./fixture/export/abc.mjs"))
      .then(assertAbcNs)
  })

  it("should support `import()` in a catch block", () => {
    try {
      throw new Error
    } catch (e) {
      return import("./fixture/export/abc.mjs")
        .then(assertAbcNs)
    }
  })

  it("should support `import()` in a class", () => {
    class P {
      constructor() {
        return import("./fixture/export/abc.mjs")
      }
    }

    return new P()
      .then(assertAbcNs)
  })

  it("should support `import()` in a function", () => {
    function p() {
      return import("./fixture/export/abc.mjs")
    }

    return p()
      .then(assertAbcNs)
  })

  it("should support `import()` with yield", () => {
    function* p() {
      yield import("./fixture/export/abc.mjs")
    }

    return p()
      .next()
      .value
      .then(assertAbcNs)
  })

  it("should be syntactic", () => {
    const lines = [
      "const f = import",
      "import.length",
      "import.name",
      "import.apply()",
      "import.call()",
      "import.toString()"
    ]

    for (const line of lines) {
      assert.throws(
        () => Compiler.compile(line),
        /SyntaxError/)
    }
  })

  it("should accept exactly one argument", () => {
    const lines = [
      "import()",
      "import(a,b)",
      "import(...[a])"
    ]

    for (const line of lines) {
      assert.throws(
        () => Compiler.compile(line),
        /SyntaxError/
      )
    }
  })
})
