import Module from "module"
import SemVer from "semver"

import assert from "assert"
import fs from "fs"

const isWin = process.platform === "win32"
const skipOutsideDot = SemVer.satisfies(process.version, ">=9")

const jsonExt = Module._extensions[".json"]
const json = JSON.parse(fs.readFileSync("./package.json", "utf8"))

const abcId = "./fixture/export/abc.mjs"

const abcNs = {
  a: "a",
  b: "b",
  c: "c",
  default: "default"
}

beforeEach(() => {
  delete global.customError
  delete global.loadCount
  delete global.reevaluate
  delete Module._extensions[".coffee"]
  Module._extensions[".json"] = jsonExt
})

describe("built-in modules", () => {
  it("should fire setters if already loaded", () =>
    import("./misc/builtin/loaded.mjs")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )

  it("should produce valid namespace objects", () =>
    import("./misc/builtin/namespace.mjs")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )
})

describe("package.json", () => {
  it("should not be enabled for nested node_modules", () =>
    import("disabled")
      .then(() => assert.ok(false))
      .catch((e) => assert.ok(e instanceof SyntaxError))
  )

  it("should respect @std/esm package options", () =>
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

  it("should respect @std/esm as package dependencies", () =>
    Promise.all([
      "dependencies",
      "dev-dependencies",
      "peer-dependencies"
    ].map((id) =>
      import(id)
        .then(() => assert.ok(true))
        .catch((e) => assert.ifError(e))
    ))
  )
})

describe("Node rules", () => {
  it("should find `.mjs` before `.js`", () =>
    import("./misc/priority/a")
      .then((ns) => assert.strictEqual(ns.default, "esm"))
      .catch((e) => assert.ifError(e))
  )

  it("should support URL ids", () =>
    Promise.all([
      abcId + "?a",
      abcId + "#a",
      abcId.replace("abc", "%61%62%63")
    ].map((id) =>
      import(id)
        .then((ns) => assert.deepEqual(ns, abcNs))
        .catch((e) => assert.ifError(e))
    ))
  )

  it("should support ids containing colons", () =>
    Promise.all([
      "./misc/with:colon.mjs",
      "./misc/with%3acolon.mjs",
      "./misc/with%3Acolon.mjs"
    ].map((id) =>
      import(id)
        .then(() => assert.ok(true))
        .catch((e) => assert.ifError(e))
    ))
  )

  it('should support local "." ids', () =>
    Promise.all([
      "./misc/relative/dot.js",
      "./misc/relative/dot-slash.js"
    ].map((id) =>
      import(id)
        .then((ns) => assert.deepEqual(ns.default, "inside dot"))
        .catch((e) => assert.ifError(e))
    ))
  )

  it("should reevaluate for ids with different query+hash", () =>
    import("./misc/load-count.mjs")
      .then((oldNs) =>
        [
          { id: "./misc/load-count.mjs?",  count: 2 },
          { id: "./misc/load-count.mjs#",  count: 3 },
          { id: "./misc/load-count.mjs?",  count: 2 },
          { id: "./misc/load-count.mjs#",  count: 3 },
          { id: "./misc/load-count.mjs?4", count: 4 },
          { id: "./misc/load-count.mjs#5", count: 5 },
          { id: "./misc/load-count.mjs?4", count: 4 },
          { id: "./misc/load-count.mjs#5", count: 5 }
        ].reduce((promise, data) =>
          promise
            .then(() => import(data.id))
            .then((ns) => {
              assert.notStrictEqual(ns, oldNs)
              assert.strictEqual(ns.default, data.count)
              oldNs = ns
            })
        , Promise.resolve())
      )
  )

  it("should not support URL ids with encoded slashes", () =>
    Promise.all([
      abcId.replace("/", "%2f"),
      abcId.replace("/", "%2F"),
      abcId.replace("/", isWin ? "%5c" : "%2f"),
      abcId.replace("/", isWin ? "%5C" : "%2F")
    ].map((id) =>
      import(id)
        .then(() => assert.ok(false))
        .catch((e) => assert.strictEqual(e.code, "ERR_MISSING_MODULE"))
    ))
  )

  it("should not resolve non-local dependencies", () =>
    Promise.all([
      "home-node-libraries",
      "home-node-modules",
      "node-path",
      "prefix-path"
    ].map((id) =>
      import(id)
        .then(() => assert.ok(false))
        .catch((e) => assert.strictEqual(e.code, "ERR_MODULE_RESOLUTION_DEPRECATED"))
    ))
  )

  it('should not resolve non-local "." ids', () =>
    import(".")
      .then(() => assert.ok(false))
      .catch((e) => {
        const expected = skipOutsideDot
          ? "ERR_MISSING_MODULE"
          : "ERR_MODULE_RESOLUTION_DEPRECATED"

        assert.strictEqual(e.code, expected)
      })
  )

  it("should not wrap custom errors", () =>
    import("./misc/custom-error.mjs")
      .then(() => assert.ok(false))
      .catch((e) => assert.strictEqual(e, global.customError))
  )

  it("should not reevaluate errors", () =>
    import("./misc/reevaluate-error.mjs")
      .then(() => assert.ok(false))
      .catch((e) =>
        import("./misc/reevaluate-error.mjs")
          .then(() => assert.ok(false))
          .catch((re) => {
            if (re.code === "ERR_ASSERTION") {
              assert.ok(false)
            } else {
              assert.strictEqual(e, re)
            }
          })
      )
  )

  it("should not support custom file extensions in ESM", () => {
    Module._extensions[".coffee"] = Module._extensions[".js"]
    return import("./misc/cof")
      .then(() => assert.ok(false))
      .catch((e) => assert.strictEqual(e.code, "ERR_MODULE_RESOLUTION_DEPRECATED"))
  })

  it("should not support overwriting `.json` handling", () => {
    Module._extensions[".json"] = () => ({})
    return import("./package.json")
      .then((ns) => assert.deepEqual(ns.default, json))
      .catch((e) => assert.ifError(e))
  })

  it("should resolve non-local dependencies with require", () =>
    import("./require.js")
      .then((ns) => {
        const require = ns.default

        const ids = [
          "home-node-libraries",
          "home-node-modules",
          "node-path",
          "prefix-path"
        ]

        ids.map((id) => assert.ok(require(id)))
      })
      .catch((e) => assert.ifError(e))
  )

  it('should resolve non-local "." ids with require', () =>
    import("./require.js")
      .then((ns) => {
        const require = ns.default
        const exported = require(".")

        if (skipOutsideDot) {
          assert.ok(false)
        } else {
          assert.strictEqual(exported, "outside dot")
        }
      })
      .catch((e) => {
        if (skipOutsideDot) {
          assert.strictEqual(e.code, "ERR_MISSING_MODULE")
        } else {
          assert.ifError(e)
        }
      })
  )
})

describe("spec compliance", () => {
  it("should bind exports before the module executes", () =>
    import("./misc/export/cycle-named.mjs")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )

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

  it("should export CJS `module.exports` as default", () =>
    import("./misc/export/cjs-default.mjs")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )

  it("should support loading ESM from dynamic import in CJS", (done) => {
    import("./import/import.js")
      .then((ns) => ns.default(done))
      .catch((e) => assert.ifError(e))
  })

  it("should not have CJS free variables", () =>
    import("./misc/free-vars.mjs")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )

  it("should not export CJS named binding", () =>
    import("./misc/export/cjs-named.mjs")
      .then(() => assert.ok(false))
      .catch((e) => {
        assert.ok(e instanceof SyntaxError)
        assert.ok(e.message.includes("' does not provide an export named '"))
      })
  )

  it("should not support loading ESM from require", () => {
    const abcPath = fs.realpathSync("./fixture/export/abc.mjs")
    const abcMod = Module._cache[abcPath]

    delete Module._cache[abcPath]

    return import("./misc/require-esm.js")
      .then(() => assert.ok(false))
      .catch((e) => {
        Module._cache[abcPath] = abcMod
        assert.strictEqual(e.code, "ERR_REQUIRE_ESM")
      })
  })

  it("should not support loading ESM from require if already loaded", () =>
    import("./misc/require-esm.js")
      .then(() => assert.ok(false))
      .catch((e) => assert.strictEqual(e.code, "ERR_REQUIRE_ESM"))
  )

  it("should not execute already loaded modules from require", () =>
    import("./misc/load-count.js")
      .then(() => import("./misc/require-load-count.js"))
      .then((ns) => assert.strictEqual(ns.default, 1))
  )

  it("should throw a syntax error when exporting duplicate local bindings", () =>
    import("./misc/export/dup-local.mjs")
      .then(() => assert.ok(false))
      .catch((e) => {
        assert.ok(e instanceof SyntaxError)
        assert.ok(e.message.startsWith("Duplicate export of '"))
      })
  )

  it("should throw a syntax error when exporting duplicate namespace bindings", () =>
    import("./misc/export/dup-namespace.mjs")
      .then(() => assert.ok(false))
      .catch((e) => {
        assert.ok(e instanceof SyntaxError)
        assert.ok(e.message.endsWith("' has already been declared"))
      })
  )

  it("should throw a syntax error when importing non-exported binding", () =>
    Promise.all([
      "./misc/import/missing-cjs.mjs",
      "./misc/import/missing-esm.mjs"
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
      "./misc/import/const.mjs",
      "./misc/import/let.mjs"
    ].map((id) =>
      import(id)
        .then(() => assert.ok(false))
        .catch((e) => {
          assert.ok(e instanceof TypeError)
          assert.ok(e.message.startsWith("Assignment to constant variable."))
        })
    ))
  )

  it("should throw a syntax error when accessing top-level `arguments`", () =>
    import("./misc/source/arguments-binding.mjs")
      .then(() => assert.ok(false))
      .catch((e) => {
        assert.ok(e instanceof SyntaxError)
        assert.ok(e.message.startsWith("Binding arguments in strict mode"))
      })
  )

  it("should throw a syntax error when creating an `arguments` binding", () =>
    Promise.all([
      "./misc/source/arguments-undefined.mjs",
      "./misc/source/arguments-undefined-nested.mjs"
    ].map((id) =>
      import(id)
        .then(() => assert.ok(false))
        .catch((e) => {
          assert.ok(e instanceof ReferenceError)
          assert.ok(e.message.startsWith("arguments is not defined"))
        })
    ))
  )

  it("should throw a syntax error when creating an `await` binding", () =>
    import("./misc/source/await-binding.mjs")
      .then(() => assert.ok(false))
      .catch((e) => {
        assert.ok(e instanceof SyntaxError)
        assert.ok(e.message.startsWith("The keyword 'await' is reserved"))
      })
  )

  it("should throw a syntax error when using top-level `new.target`", () =>
    import("./misc/source/new-target.mjs")
      .then(() => assert.ok(false))
      .catch((e) => {
        assert.ok(e instanceof SyntaxError)
        assert.ok(e.message.startsWith("new.target can only be used in functions"))
      })
  )

  it("should throw a syntax error when using an opening HTML comment in ESM", () =>
    import("./misc/source/html-comment.mjs")
      .then(() => assert.ok(false))
      .catch((e) => {
        assert.ok(e instanceof SyntaxError)
        assert.ok(e.message.startsWith("Unexpected token"))
      })
  )

  it("should not throw when accessing `arguments` in a function", () =>
    import("./misc/source/arguments-function.mjs")
      .then(() => assert.ok(true))
      .catch((e) => assert.ifError(e))
  )

  it("should not throw when typeof checking `arguments`", () =>
    import("./misc/source/arguments-typeof.mjs")
      .then(() => assert.ok(true))
      .catch((e) => assert.ifError(e))
  )

  it("should not throw when using an opening HTML comment in CJS", () =>
    import("./misc/source/html-comment.js")
      .then(() => assert.ok(true))
      .catch((e) => assert.ifError(e))
  )
})
