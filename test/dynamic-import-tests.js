import __dirname from "./__dirname.js"
import assert from "assert"
import compiler from "../dist/compiler.js"
import path from "path"

const abcId = "./fixture/abc.js"
const abcNs = {
  a: "a",
  b: "b",
  c: "c",
  default: { a: "a", b: "b", c: "c" }
}

describe("dynamic import", () => {
  it("should establish live binding of values", () =>
    import("./fixture/live.js").then((ns) => {
      ns.reset()
      assert.strictEqual(ns.value, 0)
      ns.add(2)
      assert.strictEqual(ns.value, 2)
    })
    .catch((e) => assert.ifError(e))
  )

  it("should support a variable id", () =>
    import(abcId)
      .then((ns) => assert.deepEqual(ns, abcNs))
      .catch((e) => assert.ifError(e))
  )

  it("should support a template string id", () =>
    import(`${abcId}`)
      .then((ns) => assert.deepEqual(ns, abcNs))
      .catch((e) => assert.ifError(e))
  )

  it("should support an expression id", () =>
    import((() => abcId)())
      .then((ns) => assert.deepEqual(ns, abcNs))
      .catch((e) => assert.ifError(e))
  )

  it("should support the file protocol", () =>
    import("file://" + path.join(__dirname, abcId))
      .then((ns) => assert.deepEqual(ns, abcNs))
      .catch((e) => assert.ifError(e))
  )

  it("should support whitespace between `import`, `(`, and `)`", () =>
    import
    // Comment.
    (
    "./fixture/abc.js"
    )

      .then((ns) => assert.deepEqual(ns, abcNs))
      .catch((e) => assert.ifError(e))
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
    const invalids = [
      "import()",
      "import(a,b)",
      "import(...[a])",
      "import.then()",
      "import.call(a,b)"
    ]

    invalids.forEach((code) => {
      assert.throws(() => compiler.compile(code), SyntaxError)
    })
  })
})
