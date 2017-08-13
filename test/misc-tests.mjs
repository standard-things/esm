import Module from "module"
import SemVer from "semver"

import assert from "assert"
import helper from "./helper.js"

const register = helper.register

describe("spec compliance", () => {
  it("should establish live binding of values", () =>
    import("./misc/live.mjs")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )

  it("should execute modules in the correct order", () =>
    import("./misc/order.mjs")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )

  it("should produce valid namespace objects", () =>
    import("./misc/namespace.mjs")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )

  it("should have a top-level `this` of `undefined`", () =>
    import("./misc/this.mjs")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )

  it("should not populate top-level `arguments`", () =>
    import("./misc/arguments.mjs")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )

  it("should not have CJS free variables", () =>
    import("./misc/free-vars.mjs")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )

  it("should export CJS `module.exports` as default", () =>
    import("./misc/export-cjs-default.mjs")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )

  it("should not export CJS named binding", () =>
    import("./misc/export-cjs-named.mjs")
      .then(() => assert.ok(false))
      .catch((e) => {
        assert.ok(e instanceof SyntaxError)
        assert.ok(e.message.includes("' does not provide an export named '"))
      })
  )

  it("should support loading ESM from dynamic import in CJS", (done) => {
    import("./import/cjs-import.js")
      .then((ns) => ns.default(done))
      .catch((e) => assert.ifError(e))
  })

  it("should not support loading ESM from require", () => {
    const abcPath = Module._resolveFilename("./fixture/export/abc.mjs")
    const abcMod = Module._cache[abcPath]

    register.init()
    delete Module._cache[abcPath]

    return import("./misc/require-esm.js")
      .then(() => assert.ok(false))
      .catch(({ code }) => {
        Module._cache[abcPath] = abcMod
        assert.strictEqual(code, "ERR_REQUIRE_ESM")
      })
  })

  it("should not support loading ESM from require if already loaded", () =>
    import("./misc/require-esm.js")
      .then(() => assert.ok(false))
      .catch(({ code }) => {
        assert.strictEqual(code, "ERR_REQUIRE_ESM")
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
    import("./misc/export-cycle.mjs")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )

  it("should throw a syntax error when exporting duplicate local bindings", () =>
    import("./misc/export-dup-local.mjs")
      .then(() => assert.ok(false))
      .catch((e) => {
        assert.ok(e instanceof SyntaxError)
        assert.ok(e.message.startsWith("Duplicate export of '"))
      })
  )

  it("should throw a syntax error when exporting duplicate namespace bindings", () =>
    import("./misc/export-dup-namespace.mjs")
      .then(() => assert.ok(false))
      .catch((e) => {
        assert.ok(e instanceof SyntaxError)
        assert.ok(e.message.endsWith("' has already been declared"))
      })
  )

  it("should throw a syntax error when importing non-exported binding", () =>
    Promise.all([
      "./misc/import-missing-cjs.mjs",
      "./misc/import-missing-esm.mjs"
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
      "./misc/import-const.mjs",
      "./misc/import-let.mjs"
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
    import("./misc/builtin-loaded.mjs")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )

  it("should produce valid namespace objects", () =>
    import("./misc/builtin-namespace.mjs")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )
})

describe("package.json", () => {
  it("should not be enabled for nested node_modules", () =>
    import("disabled")
      .then(() => assert.ok(false))
      .catch((e) => {
        assert.ok(e instanceof SyntaxError)
      })
  )

  it("should respect esm package options", () =>
    Promise.all([
      "@std-esm-object",
      "@std-esm-string",
      "@std-object",
      "@std-string"
    ].map((id) =>
      import(id)
        .then(() => assert.ok(true))
        .catch((e) => assert.ifError(e))
    ))
  )
})
