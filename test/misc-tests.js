import Module from "module"
import SemVer from "semver"

import assert from "assert"
import helper from "./helper.js"

const register = helper.register

describe("spec compliance", () => {
  it("should establish live binding of values", () =>
    import("./misc/live.js")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )

  it("should execute modules in the correct order", () =>
    import("./misc/order.js")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )

  it("should produce valid namespace objects", () =>
    import("./misc/namespace.js")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )

  it("should have a top-level `this` of `undefined`", () =>
    import("./misc/this.js")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )

  it("should not populate top-level `arguments`", () =>
    import("./misc/arguments.js")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )

  it("should not have CJS free variables", () =>
    import("./misc/free-vars.js")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )

  it("should export CJS `module.exports` as default", () =>
    import("./misc/export-cjs-default.js")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )

  it("should not export CJS named binding", () =>
    import("./misc/export-cjs-named.js")
      .then(() => assert.ok(false))
      .catch((e) => {
        assert.ok(e instanceof SyntaxError)
        assert.ok(e.message.includes("' does not provide an export named '"))
      })
  )

  it("should not support loading ESM from require", () => {
    const abcPath = Module._resolveFilename("./fixture/export/abc.js")
    const abcMod = Module._cache[abcPath]

    register.init()
    delete Module._cache[abcPath]

    return import("./misc/require-esm.js")
      .then(() => assert.ok(false))
      .catch((e) => {
        Module._cache[abcPath] = abcMod
        assert.ok(e instanceof SyntaxError)
      })
  })

  it("should not support loading ESM from require if already loaded", () =>
    import("./misc/require-esm.js")
      .then(() => assert.ok(false))
      .catch((e) => {
        assert.ok(e instanceof SyntaxError)
      })
  )

  it("should not executed already loaded modules from require", () =>
    import("./misc/load-count.js")
      .then(() => import("./misc/require-load-count.js"))
      .then(() => {
        assert.strictEqual(global.loadCount, 1)
        delete global.loadCount
      })
  )

  it("should bind exports before the module executes", () =>
    import("./misc/export-cycle.js")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )

  it("should throw a syntax error when exporting duplicate local bindings", () =>
    import("./misc/export-dup-local.js")
      .then(() => assert.ok(false))
      .catch((e) => {
        assert.ok(e instanceof SyntaxError)
        assert.ok(e.message.startsWith("Duplicate export of '"))
      })
  )

  it("should throw a syntax error when exporting duplicate namespace bindings", () =>
    import("./misc/export-dup-namespace.js")
      .then(() => assert.ok(false))
      .catch((e) => {
        assert.ok(e instanceof SyntaxError)
        assert.ok(e.message.endsWith("' has already been declared"))
      })
  )

  it("should throw a syntax error when importing non-exported binding", () =>
    Promise.all([
      "./misc/import-missing-cjs.js",
      "./misc/import-missing-esm.js"
    ].map((id) =>
      import(id)
        .then(() => assert.ok(false))
        .catch((e) => {
          assert.ok(e instanceof SyntaxError)
          assert.ok(e.message.includes("' does not provide an export named '"))
        })
    ))
  )

  it("should throw a type error when setting an imported identifier", () =>
    Promise.all([
      "./misc/import-const.js",
      "./misc/import-let.js"
    ].map((id) =>
      import(id)
        .then(() => assert.ok(false))
        .catch((e) => {
          assert.ok(e instanceof TypeError)
          assert.ok(e.message.startsWith("Assignment to constant variable."))
        })
    ))
  )
})

describe("built-in modules", () => {
  it("should fire setters if already loaded", () =>
    import("./misc/loaded.js")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )
})
