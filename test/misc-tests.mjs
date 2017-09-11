import SemVer from "semver"

import __dirname from "./__dirname.js"
import assert from "assert"
import fs from "fs-extra"
import path from "path"
import require from "./require.js"

const isWin = process.platform === "win32"
const skipOutsideDot = SemVer.satisfies(process.version, ">=9")

const jsonExt = require.extensions[".json"]
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
  delete global.evaluated
  delete global.loadCount
  delete require.extensions[".coffee"]
  require.extensions[".json"] = jsonExt
})

describe("built-in modules", () => {
  it("should load built-ins from CJS", () =>
    import("./misc/builtin/load.js")
      .then((ns) => assert.ok(Object.keys(ns).length))
      .catch((e) => assert.ifError(e))
  )

  it("should load built-ins from ESM", () =>
    import("./misc/builtin/load.mjs")
      .then((ns) => assert.ok(Object.keys(ns).length))
      .catch((e) => assert.ifError(e))
  )

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

describe("errors", () => {
  it("should mask stack traces", () =>
    import("MISSING_MODULE")
      .catch((e) => {
        const stack = e.stack
        assert.strictEqual(stack.includes("esm.js"), false)
      })
  )

  it("should not wrap custom errors", () =>
    import("./misc/custom-error.mjs")
      .then(() => assert.ok(false))
      .catch((e) => assert.strictEqual(e, global.customError))
  )
})

describe("Node rules", () => {
  it("should find `.mjs` before `.js`", () =>
    Promise.all([
      "./misc/priority",
      "priority"
    ].map((id) =>
      import(id)
        .then((ns) => assert.strictEqual(ns.default, "mjs"))
        .catch((e) => assert.ifError(e))
    ))
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
        .catch((e) => assert.strictEqual(e.code, "ERR_MODULE_RESOLUTION_LEGACY"))
    ))
  )

  it('should not resolve non-local "." ids', () =>
    import(".")
      .then(() => assert.ok(false))
      .catch((e) => {
        const expected = skipOutsideDot
          ? "ERR_MISSING_MODULE"
          : "ERR_MODULE_RESOLUTION_LEGACY"

        assert.strictEqual(e.code, expected)
      })
  )

  it("should not reevaluate errors", () =>
    [
      "./misc/reevaluate-error.mjs",
      "./misc/reevaluate-error.mjs?a",
      "./misc/reevaluate-error.mjs#a"
    ].reduce((promise, id, index) =>
      promise
        .then(() => {
          delete global.evaluated
          return import(id)
            .then(() => assert.ok(false))
            .catch((e) =>
              import(id)
                .then(() => assert.ok(false))
                .catch((re) => {
                  if (re.code === "ERR_ASSERTION") {
                    assert.ok(false)
                  } else {
                    assert.strictEqual(e, re)
                    assert.strictEqual(global.loadCount, index + 1)
                  }
                })
            )
          })
    , Promise.resolve())
  )

  it("should not support custom file extensions in ESM", () => {
    require.extensions[".coffee"] = require.extensions[".js"]
    return import("./misc/cof")
      .then(() => assert.ok(false))
      .catch((e) => assert.strictEqual(e.code, "ERR_MODULE_RESOLUTION_LEGACY"))
  })

  it("should not support overwriting `.json` handling", () => {
    require.extensions[".json"] = () => ({})
    return import("./package.json")
      .then((ns) => assert.deepEqual(ns.default, json))
      .catch((e) => assert.ifError(e))
  })

  it("should not cache ES modules in `require.cache`", () => {
    const filePath = path.resolve(__dirname, "./misc/cache/out.mjs")

    delete require.cache[filePath]
    return import("./misc/cache/out/")
      .then(() => assert.strictEqual(filePath in require.cache, false))
      .catch((e) => assert.ifError(e))
  })

  it("should resolve non-local dependencies with `require`", () => {
    const ids = [
      "home-node-libraries",
      "home-node-modules",
      "node-path",
      "prefix-path"
    ]

    ids.map((id) => assert.ok(require(id)))
  })

  it('should resolve non-local "." ids with `require`', () => {
    try {
      const exported = require(".")

      if (skipOutsideDot) {
        assert.ok(false)
      } else {
        assert.strictEqual(exported, "outside dot")
      }
    } catch (e) {
      if (skipOutsideDot) {
        assert.strictEqual(e.code, "ERR_MISSING_MODULE")
      } else {
        assert.ifError(e)
      }
    }
  })

  it("should cache ES modules in `require.cache` with `options.cjs`", () => {
    const filePath = path.resolve(__dirname, "./misc/cache/in.mjs")

    delete require.cache[filePath]
    return import("./misc/cache/in/")
      .then(() => assert.ok(filePath in require.cache))
      .catch((e) => assert.ifError(e))
  })

  it('should add "__esModule" to `module.exports` of ES modules with `options.cjs`', () =>
    import("./misc/esmodule/")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
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

  it("should load CJS modules that delete their cache entry", () => {
    return import("./misc/delete-cache.js")
      .then((ns) => assert.deepEqual(ns.default, "delete cache"))
      .catch((e) => assert.ifError(e))
  })

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

  it("should not support loading ESM from require", () =>
    import("./misc/require-esm.js")
      .then(() => assert.ok(false))
      .catch((e) => assert.strictEqual(e.code, "ERR_REQUIRE_ESM"))
  )

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
      "./misc/import/missing-esm.mjs",
      "./misc/import/missing-cycle-a.mjs"
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
