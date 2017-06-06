import assert from "assert"
import { compile } from "../lib/compiler.js"
import path from "path"

const canUseToStringTag = typeof Symbol.toStringTag === "symbol"

const abcId = "./fixture/abc.js"
const abcNs = {
  a: "a",
  b: "b",
  c: "c",
  default: { a: "a", b: "b", c: "c" }
}

describe("dynamic import", () => {
  it("should resolve as a namespace import", () =>
    import("./fixture/abc.js").then((ns) => {
      const nsTag = canUseToStringTag ? "[object Module]" : "[object Object]"

      assert.ok(Object.isSealed(ns))
      assert.strictEqual(Object.prototype.toString.call(ns), nsTag)
      assert.deepEqual(ns, abcNs)
    })
  )

  it("should establish live binding of values", () =>
    import("./fixture/live.js").then((ns) => {
      ns.reset()
      assert.strictEqual(ns.value, 0)
      ns.add(2)
      assert.strictEqual(ns.value, 2)
    })
  )

  it("should support a variable id", () =>
    import(abcId)
      .then((ns) => assert.deepEqual(ns, abcNs))
  )

  it("should support a template string id", () =>
    import(`${abcId}`)
      .then((ns) => assert.deepEqual(ns, abcNs))
  )

  it("should support an expression id", () =>
    import((() => abcId)())
      .then((ns) => assert.deepEqual(ns, abcNs))
  )

  it("should support the file protocol", () =>
    import("file://" + path.join(__dirname, abcId))
      .then((ns) => assert.deepEqual(ns, abcNs))
  )

  it("should support whitespace between `import`, `(`, and `)`", () =>
    import
    // Comment.
    (
    "./fixture/abc.js"
    )

      .then((ns) => assert.deepEqual(ns, abcNs))
  )

  it("should support import() in an assignment", () => {
    const p = import("./fixture/abc.js")
    assert.ok(p instanceof Promise)
  })

  it("should support import() in a function", () => {
    function p() {
      return import("./fixture/abc.js")
    }

    assert.ok(p() instanceof Promise)
  })

  it("should support import() with yield", () => {
    function* p() {
      yield import("./fixture/abc.js")
    }

    assert.ok(p())
  })

  it("should expect exactly one argument", () => {
    assert.ok([
      "import()",
      "import(a,b)",
      "import(...[a])",
      "import.then()",
      "import.call(a,b)"
    ].every((code) => {
      try {
        compile(code)
      } catch (e) {
        return e instanceof SyntaxError
      }
    }))
  })
})
