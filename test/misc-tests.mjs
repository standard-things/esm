import SemVer from "semver"

import assert from "assert"
import fs from "fs-extra"
import path from "path"
import require from "./require.js"

const isWin = process.platform === "win32"

const __filename = import.meta.url.slice(isWin ? 8 : 7)
const __dirname = path.dirname(__filename)

const pkgJSON = JSON.parse(fs.readFileSync("../package.json", "utf8"))
const pkgPath = path.resolve(__dirname, "../index.js")
const skipOutsideDot = SemVer.satisfies(process.version, ">=9")

const abcId = "./fixture/export/abc.mjs"

const abcNs = {
  a: "a",
  b: "b",
  c: "c",
  default: "default"
}

function checkError(error, code) {
  const proto = Object.getPrototypeOf(error)
  const codeDescriptor = Object.getOwnPropertyDescriptor(proto, "code")
  const nameDescriptor = Object.getOwnPropertyDescriptor(proto, "name")

  assert.strictEqual(error.code, code)
  assert.strictEqual(error.name, "Error [" + code + "]")

  error.code = "ERR_CUSTOM"
  assert.strictEqual(error.code, "ERR_CUSTOM")
  Object.defineProperty(error, "code", codeDescriptor)

  error.name = "Custom"
  assert.strictEqual(error.name, "Custom")
  Object.defineProperty(error, "name", nameDescriptor)
}

function checkErrorStack(error, startsWith) {
  const stack = error.stack.replace(/\r\n/g, "\n")
  assert.ok(stack.startsWith(startsWith) || stack.startsWith("SyntaxError:"))
}

describe("built-in modules", () => {
  it("should load built-in modules", () =>
    import("./misc/builtin/load.mjs")
      .then((ns) => ns.default())
      .catch((e) => assert.ifError(e))
  )

  it("should fire setters if already loaded", () =>
    import("./misc/builtin/loaded.mjs")
      .then((ns) => ns.default())
      .catch((e) => assert.ifError(e))
  )

  it("should produce valid namespace objects", () =>
    import("./misc/builtin/namespace.mjs")
      .then((ns) => ns.default())
      .catch((e) => assert.ifError(e))
  )
})

describe("package.json", () => {
  it("should not be enabled for nested node_modules", () =>
    import("disabled")
      .then(() => assert.ok(false))
      .catch((e) => assert.ok(e instanceof SyntaxError))
  )

  it("should support `@std/esm` package options", () =>
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

  it("should support `@std/esm` as package dependencies", () =>
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
  it("should not wrap custom errors", () =>
    import("./fixture/error/custom.mjs")
      .then(() => assert.ok(false))
      .catch((e) => assert.strictEqual(e, global.customError))
  )

  it("should mask stack arrows", () => {
    const id1 = path.resolve(__dirname, "fixture/error/import.mjs")
    const id2 = path.resolve(__dirname, "fixture/error/export.js")
    const id3 = path.resolve(__dirname, "fixture/error/import.js")
    const id4 = path.resolve(__dirname, "fixture/error/nested.mjs")
    const id5 = path.resolve(__dirname, "fixture/error/syntax.js")
    const id6 = path.resolve(__dirname, "node_modules/error/index.js")

    return Promise.all([
      import(id1)
        .then(() => assert.ok(false))
        .catch((e) => {
          checkErrorStack(e, [
            id2 + ":1",
            'export const a = "a"',
            "^"
          ].join("\n"))

          assert.strictEqual(e.stack.includes(id1 + ":"), false)
        }),
        import(id3)
        .then(() => assert.ok(false))
        .catch((e) =>
          checkErrorStack(e, [
            id3 + ":1",
            'import { a } from "./export.js"',
            "^"
          ].join("\n"))
        ),
      import(id4)
        .then(() => assert.ok(false))
        .catch((e) =>
          checkErrorStack(e, [
            id4 + ":2",
            '  import"nested"',
            "  ^"
          ].join("\n"))
        ),
      import(id5)
        .then(() => assert.ok(false))
        .catch((e) =>
          checkErrorStack(e, [
            id5 + ":1",
            "syntax@error",
            "      ^"
          ].join("\n"))
        ),
      import(id6)
        .then(() => assert.ok(false))
        .catch((e) =>
          checkErrorStack(e, [
            id6 + ":1",
            "syntax@error",
            "      ^"
          ].join("\n"))
        )
    ])
  })

  it("should mask stack traces", () =>
    import("./fixture/error/import.mjs")
      .then(() => assert.ok(false))
      .catch((e) => assert.strictEqual(e.stack.includes(pkgPath), false))
  )
})

describe("Node rules", () => {
  it("should find `.mjs` before `.js`", () =>
    Promise.all([
      "./fixture/priority",
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
      "./fixture/with:colon.mjs",
      "./fixture/with%3acolon.mjs",
      "./fixture/with%3Acolon.mjs"
    ].map((id) =>
      import(id)
        .then(() => assert.ok(true))
        .catch((e) => assert.ifError(e))
    ))
  )

  it("should support ids containing pounds", () =>
    import("./fixture/with%23pound.mjs")
      .then(() => assert.ok(true))
      .catch((e) => assert.ifError(e))
  )

  it('should support local "." ids', () =>
    Promise.all([
      "./fixture/relative/dot.js",
      "./fixture/relative/dot-slash.js"
    ].map((id) =>
      import(id)
        .then((ns) => assert.deepEqual(ns.default, "inside dot"))
        .catch((e) => assert.ifError(e))
    ))
  )

  it("should reevaluate for ids with different query+hash", () =>
    import("./fixture/load-count.mjs")
      .then((oldNs) =>
        [
          { id: "./fixture/load-count.mjs?",    count: 2 },
          { id: "./fixture/load-count.mjs#",    count: 3 },
          { id: "./fixture/load-count.mjs?",    count: 2 },
          { id: "./fixture/load-count.mjs#",    count: 3 },
          { id: "./fixture/load-count.mjs?4",   count: 4 },
          { id: "./fixture/load-count.mjs#5",   count: 5 },
          { id: "./fixture/load-count.mjs?4",   count: 4 },
          { id: "./fixture/load-count.mjs#5",   count: 5 },
          { id: "./fixture/load-count.mjs?6#6", count: 6 },
          { id: "./fixture/load-count.mjs#5",   count: 5 },
          { id: "./fixture/load-count.mjs?6#6", count: 6 }
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
        .catch((e) => checkError(e, "ERR_MISSING_MODULE"))
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
        .catch((e) => checkError(e, "ERR_MODULE_RESOLUTION_LEGACY"))
    ))
  )

  it('should not resolve non-local "." ids', () =>
    import(".")
      .then(() => assert.ok(false))
      .catch((e) => checkError(e,
        skipOutsideDot
          ? "ERR_MISSING_MODULE"
          : "ERR_MODULE_RESOLUTION_LEGACY"
      ))
  )

  it("should not reevaluate errors", () =>
    [
      "./fixture/reevaluate-error.mjs",
      "./fixture/reevaluate-error.mjs?a",
      "./fixture/reevaluate-error.mjs#a"
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
    return import("./fixture/cof")
      .then(() => assert.ok(false))
      .catch((e) => checkError(e, "ERR_MODULE_RESOLUTION_LEGACY"))
  })

  it("should not support overwriting `.json` handling", () => {
    require.extensions[".json"] = () => ({})
    return import("../package.json")
      .then((ns) => assert.deepEqual(ns.default, pkgJSON))
      .catch((e) => assert.ifError(e))
  })

  it("should not cache ES modules in `require.cache`", () => {
    const filePath = path.resolve(__dirname, "fixture/cache/out/file.mjs")

    delete require.cache[filePath]
    return import("./fixture/cache/out")
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
        checkError(e, "ERR_MISSING_MODULE")
      } else {
        assert.ifError(e)
      }
    }
  })

  it("should cache ES modules in `require.cache` with `options.cjs`", () => {
    const filePath = path.resolve(__dirname, "fixture/cache/in/file.mjs")

    delete require.cache[filePath]
    return import("./fixture/cache/in")
      .then(() => assert.ok(filePath in require.cache))
      .catch((e) => assert.ifError(e))
  })

  it('should add "__esModule" to `module.exports` of ES modules with `options.cjs`', () =>
    import("./misc/export/pseudo")
      .then((ns) => ns.default())
      .catch((e) => assert.ifError(e))
  )
})

describe("spec compliance", () => {
  it("should bind exports before the module executes", () =>
    import("./misc/export/cycle-named.mjs")
      .then((ns) => ns.default())
      .catch((e) => assert.ifError(e))
  )

  it("should establish live binding of values", () =>
    import("./misc/live.mjs")
      .then((ns) => ns.default())
      .catch((e) => assert.ifError(e))
  )

  it("should execute modules in the correct order", () =>
    import("./misc/order.mjs")
      .then((ns) => ns.default())
      .catch((e) => assert.ifError(e))
  )

  it("should produce valid namespace objects", () =>
    import("./misc/namespace.mjs")
      .then((ns) => ns.default())
      .catch((e) => assert.ifError(e))
  )

  it("should have a top-level `this` of `undefined`", () =>
    import("./misc/this.mjs")
      .then((ns) => ns.default())
      .catch((e) => assert.ifError(e))
  )

  it("should export CJS `module.exports` as default", () =>
    import("./misc/export/cjs-default.mjs")
      .then((ns) => ns.default())
      .catch((e) => assert.ifError(e))
  )

  it("should load CJS modules that delete their cache entry", () => {
    return import("./fixture/delete-cache.js")
      .then((ns) => assert.deepEqual(ns.default, "delete cache"))
      .catch((e) => assert.ifError(e))
  })

  it("should support `import.meta` in ESM", () =>
    import("./misc/meta.mjs")
      .then((ns) => ns.default())
      .catch((e) => assert.ifError(e))
  )

  it("should support loading ESM from dynamic import in CJS", () =>
    import("./misc/import.js")
      .then((ns) => ns.default())
      .catch((e) => assert.ifError(e))
  )

  it("should not have CJS free variables", () =>
    import("./misc/free-vars.mjs")
      .then((ns) => ns.default())
      .catch((e) => assert.ifError(e))
  )

  it("should not export CJS named binding", () =>
    import("./fixture/export/cjs-named.mjs")
      .then(() => assert.ok(false))
      .catch((e) => {
        assert.ok(e instanceof SyntaxError)
        assert.ok(e.message.includes("' does not provide an export named '"))
      })
  )

  it("should not support `import.meta` in CJS", () =>
    import("./fixture/meta.js")
      .then((ns) => assert.ok(false))
      .catch((e) => {
        assert.ok(e instanceof SyntaxError)
        assert.ok(e.message.startsWith("'import.meta' may only be used in ES modules"))
      })
  )

  it("should not support loading ESM from require", () =>
    import("./fixture/require-esm.js")
      .then(() => assert.ok(false))
      .catch((e) => checkError(e, "ERR_REQUIRE_ESM"))
  )

  it("should not support loading ESM from require if already loaded", () =>
    import("./fixture/require-esm.js")
      .then(() => assert.ok(false))
      .catch((e) => checkError(e, "ERR_REQUIRE_ESM"))
  )

  it("should not execute already loaded modules from require", () =>
    import("./fixture/load-count.js")
      .then(() => import("./fixture/require-load-count.js"))
      .then((ns) => assert.strictEqual(ns.default, 1))
  )

  it("should throw a syntax error when exporting duplicate local bindings", () =>
    import("./fixture/export/dup-local.mjs")
      .then(() => assert.ok(false))
      .catch((e) => {
        assert.ok(e instanceof SyntaxError)
        assert.ok(e.message.startsWith("Duplicate export of '"))
      })
  )

  it("should throw a syntax error when exporting duplicate namespace bindings", () =>
    import("./fixture/export/dup-namespace.mjs")
      .then(() => assert.ok(false))
      .catch((e) => {
        assert.ok(e instanceof SyntaxError)
        assert.ok(e.message.endsWith("' has already been declared"))
      })
  )

  it("should throw a syntax error when importing non-exported binding", () =>
    Promise.all([
      "./fixture/import/missing-cjs.mjs",
      "./fixture/import/missing-esm.mjs",
      "./fixture/cycle/missing/a.mjs"
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
      "./fixture/import/const.mjs",
      "./fixture/import/let.mjs"
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
    import("./fixture/source/arguments-binding.mjs")
      .then(() => assert.ok(false))
      .catch((e) => {
        assert.ok(e instanceof SyntaxError)
        assert.ok(e.message.startsWith("Binding arguments in strict mode"))
      })
  )

  it("should throw a syntax error when creating an `arguments` binding", () =>
    Promise.all([
      "./fixture/source/arguments-undefined.mjs",
      "./fixture/source/arguments-undefined-nested.mjs"
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
    import("./fixture/source/await-binding.mjs")
      .then(() => assert.ok(false))
      .catch((e) => {
        assert.ok(e instanceof SyntaxError)
        assert.ok(e.message.startsWith("The keyword 'await' is reserved"))
      })
  )

  it("should throw a syntax error when using top-level `new.target`", () =>
    import("./fixture/source/new-target.mjs")
      .then(() => assert.ok(false))
      .catch((e) => {
        assert.ok(e instanceof SyntaxError)
        assert.ok(e.message.startsWith("new.target can only be used in functions"))
      })
  )

  it("should throw a syntax error when using an opening HTML comment in ESM", () =>
    import("./fixture/source/html-comment.mjs")
      .then(() => assert.ok(false))
      .catch((e) => {
        assert.ok(e instanceof SyntaxError)
        assert.ok(e.message.startsWith("HTML comments are not allowed in modules"))
      })
  )

  it("should not throw when accessing `arguments` in a function", () =>
    import("./fixture/source/arguments-function.mjs")
      .then(() => assert.ok(true))
      .catch((e) => assert.ifError(e))
  )

  it("should not throw when typeof checking `arguments`", () =>
    import("./fixture/source/arguments-typeof.mjs")
      .then(() => assert.ok(true))
      .catch((e) => assert.ifError(e))
  )

  it("should not throw when using an opening HTML comment in CJS", () =>
    import("./fixture/source/html-comment.js")
      .then(() => assert.ok(true))
      .catch((e) => assert.ifError(e))
  )
})
