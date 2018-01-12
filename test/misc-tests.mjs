import JSON6 from "json-6"
import SemVer from "semver"

import assert from "assert"
import createNamespace from "./create-namespace.js"
import fs from "fs-extra"
import mockIo from "mock-stdio"
import require from "./require.js"
import util from "util"

const WARNING_PREFIX = "(" + process.release.name + ":" + process.pid + ") "

const isWin = process.platform === "win32"

const fileProtocol = "file://" + (isWin ? "/" : "")
const skipOutsideDot = SemVer.satisfies(process.version, ">=10")
const slashRegExp = /[\\/]/g

const pkgPath = require.resolve("../")
const pkgJSON = JSON6.parse(fs.readFileSync("../package.json"))
const pkgOptions = fs.pathExistsSync(".esmrc")
  ? JSON6.parse(fs.readFileSync(".esmrc"))
  : pkgJSON["@std/esm"]

const abcPath = require.resolve("./fixture/export/abc.mjs")
const abcNs = createNamespace({
  a: "a",
  b: "b",
  c: "c",
  default: "default"
})

function checkError(error, code) {
  const message = error.message
  checkErrorProps(error, code, message)
  checkErrorCustomProps(error, code, message)
  checkErrorProps(error, code, message)
}

function checkErrorCustomProps(error, code, message) {
  error.code = "ERR_CUSTOM"
  assert.strictEqual(error.code, "ERR_CUSTOM")
  assert.strictEqual(error.toString(), "Error [" + code + "]: " + message)
  assert.deepStrictEqual(Object.keys(error), ["code"])

  error.name = "Custom"
  assert.strictEqual(error.name, "Custom")
  assert.strictEqual(error.toString(), "Custom: " + message)
  assert.deepStrictEqual(Object.keys(error), ["code", "name"])

  delete error.code
  delete error.name
}

function checkErrorProps(error, code, message) {
  assert.strictEqual(error.code, code)
  assert.strictEqual(error.name, "Error [" + code + "]")
  assert.strictEqual(error.toString(), "Error [" + code + "]: " + message)

  const actual = Object.getOwnPropertyNames(error).sort()
  const expected = Object.getOwnPropertyNames(new Error("x")).sort()

  assert.deepStrictEqual(actual, expected)
  assert.deepStrictEqual(Object.keys(error), [])
}

function checkErrorStack(error, startsWith) {
  const stack = error.stack.replace(/\r\n/g, "\n")
  assert.ok(stack.startsWith(startsWith) || stack.startsWith("SyntaxError:"))
}

function getURLFromFilePath(filePath) {
  return fileProtocol + filePath.replace(/\\/g, "/")
}

function getWarning() {
  return WARNING_PREFIX + "Warning: " +
    util.format.apply(util, arguments) + "\n"
}

describe("built-in modules", () => {
  it("should load built-in modules", () =>
    import("./misc/builtin/load.mjs")
      .then((ns) => ns.default())
  )

  it("should fire setters if already loaded", () =>
    import("./misc/builtin/loaded.mjs")
      .then((ns) => ns.default())
  )

  it("should produce valid namespace objects", () =>
    import("./misc/builtin/namespace.mjs")
      .then((ns) => ns.default())
  )
})

describe("package.json", () => {
  it("should not be enabled for nested node_modules", () =>
    import("disabled")
      .then(() => assert.ok(false))
      .catch((e) => assert.ok(e instanceof SyntaxError))
  )

  it("should support .esmrc options", () =>
    Promise.all([
      "./fixture/options-file/esmrc-object",
      "./fixture/options-file/esmrc-string-cjs",
      "./fixture/options-file/esmrc-string-js"
    ].map((id) =>
      import(id)
        .then(() => assert.ok(true))
    ))
  )

  it("should support .esmrc.json options", () =>
    Promise.all([
      "./fixture/options-file/esmrc-json-object",
      "./fixture/options-file/esmrc-json-string-cjs",
      "./fixture/options-file/esmrc-json-string-js"
    ].map((id) =>
      import(id)
        .then(() => assert.ok(true))
    ))
  )

  it("should support .esmrc.gz options", () =>
    Promise.all([
      "./fixture/options-file/esmrc-gz-object",
      "./fixture/options-file/esmrc-gz-string-cjs",
      "./fixture/options-file/esmrc-gz-string-js"
    ].map((id) =>
      import(id)
        .then(() => assert.ok(true))
    ))
  )

  it("should support .esmrc.js options", () =>
    Promise.all([
      "./fixture/options-file/esmrc-js-object",
      "./fixture/options-file/esmrc-js-string-cjs",
      "./fixture/options-file/esmrc-js-string-js"
    ].map((id) =>
      import(id)
        .then(() => assert.ok(true))
    ))
  )

  it("should support .esmrc.js.gz options", () =>
    Promise.all([
      "./fixture/options-file/esmrc-js-gz-object",
      "./fixture/options-file/esmrc-js-gz-string-cjs",
      "./fixture/options-file/esmrc-js-gz-string-js"
    ].map((id) =>
      import(id)
        .then(() => assert.ok(true))
    ))
  )

  it("should support .esmrc.mjs options", () =>
    Promise.all([
      "./fixture/options-file/esmrc-mjs-object",
      "./fixture/options-file/esmrc-mjs-string-cjs",
      "./fixture/options-file/esmrc-mjs-string-js"
    ].map((id) =>
      import(id)
        .then(() => assert.ok(true))
    ))
  )

  it("should support .esmrc.mjs.gz options", () =>
    Promise.all([
      "./fixture/options-file/esmrc-mjs-gz-object",
      "./fixture/options-file/esmrc-mjs-gz-string-cjs",
      "./fixture/options-file/esmrc-mjs-gz-string-js"
    ].map((id) =>
      import(id)
        .then(() => assert.ok(true))
    ))
  )

  it("should support @std/esm package options", () =>
    Promise.all([
      "./fixture/options-file/@std-esm-object",
      "./fixture/options-file/@std-esm-string-cjs",
      "./fixture/options-file/@std-esm-string-js",
      "./fixture/options-file/@std-object",
      "./fixture/options-file/@std-string-cjs",
      "./fixture/options-file/@std-string-js"
    ].map((id) =>
      import(id)
        .then(() => assert.ok(true))
    ))
  )

  it("should apply .esmrc over package.json options", () =>
    import("./fixture/options-priority")
      .then(() => assert.ok(true))
  )

  it("should support @std/esm as package dependencies", () =>
    Promise.all([
      "dependencies",
      "dev-dependencies",
      "peer-dependencies"
    ].map((id) =>
      import(id)
        .then(() => assert.ok(true))
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
    const id1 = require.resolve("./fixture/error/import.mjs")
    const id2 = require.resolve("./fixture/error/export.js")
    const id3 = require.resolve("./fixture/error/import.js")
    const id4 = require.resolve("./fixture/error/nested.mjs")
    const id5 = require.resolve("./fixture/error/syntax.js")
    const id6 = require.resolve("./node_modules/error/index.js")

    return Promise.all([
      import(id1)
        .then(() => assert.ok(false))
        .catch((e) =>
          checkErrorStack(e, [
            id2 + ":1",
            'export const a = "a"',
            "^\n"
          ].join("\n"))
        ),
      import(id3)
        .then(() => assert.ok(false))
        .catch((e) =>
          checkErrorStack(e, [
            id3 + ":1",
            'import { a } from "./export.js"',
            "^\n"
          ].join("\n"))
        ),
      import(id4)
        .then(() => assert.ok(false))
        .catch((e) =>
          checkErrorStack(e, [
            getURLFromFilePath(id4) + ":2",
            '  import"nested"',
            "  ^\n"
          ].join("\n"))
        ),
      import(id5)
        .then(() => assert.ok(false))
        .catch((e) =>
          checkErrorStack(e, [
            id5 + ":1",
            "syntax@error",
            "\n"
          ].join("\n"))
        ),
      import(id6)
        .then(() => assert.ok(false))
        .catch((e) => {
          const startsWith = [id6 + ":1"]

          if (pkgOptions.debug) {
            startsWith.push(
              "(function (exports, require, module, __filename, __dirname) { syntax@error",
              "                                                                    ^\n"
            )
          } else {
            startsWith.push(
              "syntax@error",
              "      ^\n"
            )
          }

          checkErrorStack(e, startsWith.join("\n"))
        })
    ])
  })

  it("should mask stack traces", () =>
    import("./fixture/error/import.mjs")
      .then(() => assert.ok(false))
      .catch((e) => assert.strictEqual(e.stack.includes(pkgPath), false))
  )
})

describe("Node rules", () => {
  it("should find .mjs before .js", () =>
    Promise.all([
      "./fixture/file-extension-priority",
      "file-extension-priority"
    ].map((id) =>
      import(id)
        .then((ns) => assert.strictEqual(ns.default, "mjs"))
    ))
  )

  it("should support URL ids", () =>
    Promise.all([
      abcPath + "?a",
      abcPath + "#a",
      abcPath.replace("abc", "%61%62%63")
    ].map((id) =>
      import(id)
        .then((ns) => assert.deepStrictEqual(ns, abcNs))
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
    ))
  )

  it("should support ids containing percents", () =>
    import("./fixture/with%2520percent.mjs")
      .then(() => assert.ok(true))
  )

  it("should support ids containing pounds", () =>
    import("./fixture/with%23pound.mjs")
      .then(() => assert.ok(true))
  )

  it('should support local "." ids', () =>
    Promise.all([
      "./fixture/relative/dot.js",
      "./fixture/relative/dot-slash.js"
    ].map((id) =>
      import(id)
        .then((ns) => assert.strictEqual(ns.default, "inside dot"))
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
      abcPath.replace(slashRegExp, "%2f"),
      abcPath.replace(slashRegExp, "%2F"),
      abcPath.replace(slashRegExp, isWin ? "%5c" : "%2f"),
      abcPath.replace(slashRegExp, isWin ? "%5C" : "%2F")
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

  it("should not support overwriting .json handling", () => {
    require.extensions[".json"] = () => ({})
    return import("../package.json")
      .then((ns) => assert.deepStrictEqual(ns.default, pkgJSON))
  })

  it("should not expose ESM in `module.parent`", () =>
    import("./fixture/parent/off")
      .then((ns) => {
        const mod = ns.default
        assert.ok("parent" in mod)
        assert.strictEqual(mod.parent, void 0)
      })
  )

  it("should expose ESM in `module.parent` with `options.cjs.cache`", () =>
    import("./fixture/parent/on")
      .then((ns) => {
        const mod = ns.default
        assert.ok(mod.parent)
      })
  )

  it("should not expose ESM in `require.cache`", () => {
    const filePath = require.resolve("./fixture/cache/out")

    delete require.cache[filePath]
    return import(filePath)
      .then(() => assert.strictEqual(filePath in require.cache, false))
  })

  it("should expose ESM in `require.cache` with `options.cjs.cache`", () =>
    import("./misc/cache")
      .then((ns) => ns.default())
  )

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
        throw e
      }
    }
  })

  it('should add "__esModule" to `module.exports` of ES modules with `options.cjs`', () =>
    import("./misc/export/pseudo")
      .then((ns) => ns.default())
  )
})

describe("spec compliance", () => {
  it("should establish bindings before the module executes", () =>
    import("./misc/bindings.mjs")
      .then((ns) => ns.default())
  )

  it("should hoist declarations before the module executes", () =>
    import("./misc/declarations.mjs")
      .then((ns) => ns.default())
  )

  it("should establish live binding of values", () =>
    import("./misc/live.mjs")
      .then((ns) => ns.default())
  )

  it("should execute modules in the correct order", () =>
    import("./misc/order.mjs")
      .then((ns) => ns.default())
  )

  it("should produce valid namespace objects", () =>
    import("./misc/namespace.mjs")
      .then((ns) => ns.default())
  )

  it("should have a top-level `this` of `undefined`", () =>
    import("./misc/this.mjs")
      .then((ns) => ns.default())
  )

  it("should export CJS `module.exports` as default", () =>
    import("./misc/export/cjs-default.mjs")
      .then((ns) => ns.default())
  )

  it("should load CJS modules that delete their cache entry", () => {
    return import("./fixture/delete-cache.js")
      .then((ns) => assert.strictEqual(ns.default, "delete cache"))
  })

  it("should support `import.meta` in ESM", () =>
    import("./misc/meta.mjs")
      .then((ns) => ns.default())
  )

  it("should support dynamic import in CJS", () =>
    import("./misc/import/dynamic.js")
      .then((ns) => ns.default())
  )

  it("should not have CJS free variables", () =>
    import("./misc/free-vars.mjs")
      .then((ns) => ns.default())
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

  it("should not execute already loaded modules", () =>
    [
      "./fixture/load-count.js",
      "./fixture/cycle/load-count/a.js",
      "./fixture/cycle/load-count/a.mjs"
    ].reduce((promise, id) => {
      return promise
        .then(() => {
          delete global.loadCount
          delete require.cache[require.resolve("./fixture/load-count.js")]
          return import(id)
        })
        .then(() => assert.strictEqual(global.loadCount, 1))
    }, Promise.resolve())
  )

  it("should not execute already loaded modules from require", () =>
    import("./fixture/load-count.js")
      .then(() => assert.strictEqual(require("./fixture/load-count.js"), 1))
  )

  it("should not error when importing a non-ambiguous export", () =>
    import("./misc/import/non-ambiguous.mjs")
      .then((ns) => ns.default())
  )

  it("should error when exporting duplicate local bindings", () =>
    import("./fixture/export/dup-local.mjs")
      .then(() => assert.ok(false))
      .catch((e) => {
        assert.ok(e instanceof SyntaxError)
        assert.ok(e.message.startsWith("Duplicate export of '"))
      })
  )

  it("should error when importing or re-exporting a conflicted star exports", () =>
    Promise.all([
      "./fixture/import/star-conflict.mjs",
      "./fixture/export/star-conflict.mjs"
    ].map((id) =>
      import(id)
        .then(() => assert.ok(false))
        .catch((e) => {
          assert.ok(e instanceof SyntaxError)
          assert.ok(e.message.includes("contains conflicting star exports for name '"))
        })
    ))
  )

  it("should error with legacy code missing modules in CJS", () =>
    import("./fixture/import/missing/module/cjs.js")
      .then(() => assert.ok(false))
      .catch((e) => assert.strictEqual(e.code, "MODULE_NOT_FOUND"))
  )

  it("should error for missing modules before code execution", () =>
    Promise.all([
      "./fixture/import/missing/module/cjs.mjs",
      "./fixture/import/missing/module/esm.mjs",
      "./fixture/cycle/missing/module/a.mjs"
    ].map((id) =>
      import(id)
        .then(() => assert.ok(false))
        .catch((e) => {
          assert.strictEqual("loadCount" in global, false)
          assert.strictEqual(e.code, "ERR_MISSING_MODULE")
        })
    ))
  )

  it("should error when importing non-exported binding before code execution", () =>
    Promise.all([
      "./fixture/import/missing/export/cjs.mjs",
      "./fixture/import/missing/export/esm.mjs",
      "./fixture/cycle/missing/export/a.mjs"
    ].map((id) =>
      import(id)
        .then(() => assert.ok(false))
        .catch((e) => {
          assert.strictEqual("loadCount" in global, false)
          assert.ok(e.message.includes("' does not provide an export named 'NOT_EXPORTED'"))
        })
    ))
  )

  it("should error when setting an imported identifier", () =>
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

  it("should error when creating an `arguments` binding", () => {
    const id = require.resolve("./fixture/source/arguments-binding.mjs")

    import(id)
      .then(() => assert.ok(false))
      .catch((e) =>
        checkErrorStack(e, [
          getURLFromFilePath(id) + ":1",
          "const arguments = 1",
          "      ^\n",
          "SyntaxError: Binding arguments in strict mode"
        ].join("\n"))
      )
  })

  it("should error when creating an `await` binding", () => {
    const id = require.resolve("./fixture/source/await-binding.mjs")

    return import(id)
      .then(() => assert.ok(false))
      .catch((e) =>
        checkErrorStack(e, [
          getURLFromFilePath(id) + ":1",
          "const await = 1",
          "      ^\n",
          "SyntaxError: The keyword 'await' is reserved"
        ].join("\n"))
      )
  })

  it("should error when exporting non-local bindings", () => {
    const id = require.resolve("./fixture/source/non-local-export.mjs")

    return import(id)
      .then(() => assert.ok(false))
      .catch((e) =>
        checkErrorStack(e, [
          getURLFromFilePath(id) + ":1",
          "export { global }",
          "         ^^^^^^\n",
          "SyntaxError: Export 'global' is not defined in module"
        ].join("\n"))
      )
  })

  it("should error when using top-level `new.target`", () => {
    const id = require.resolve("./fixture/source/new-target.mjs")

    return import(id)
      .then(() => assert.ok(false))
      .catch((e) =>
        checkErrorStack(e, [
          getURLFromFilePath(id) + ":1",
          "new.target",
          "^\n",
          "SyntaxError: new.target can only be used in functions"
        ].join("\n"))
      )
  })

  it("should error when using an opening HTML comment in ESM", () => {
    const id = require.resolve("./fixture/source/html-comment.mjs")

    return import(id)
      .then(() => assert.ok(false))
      .catch((e) =>
        checkErrorStack(e, [
          getURLFromFilePath(id) + ":1",
          "<!--",
          "^\n",
          "SyntaxError: HTML comments are not allowed in modules"
        ].join("\n"))
      )
   })

  it("should warn when creating an `arguments` binding", () =>
    [
      { id: "./fixture/source/arguments-undefined.mjs", loc: "1:0" },
      { id: "./fixture/source/arguments-undefined-nested.mjs", loc: "2:2" }
    ].reduce((promise, data) => {
      const filePath = require.resolve(data.id)
      const stderr = getWarning("@std/esm detected undefined arguments access (%s): %s", data.loc, filePath)

      return promise
        .then(() => {
          mockIo.start()
          return import(filePath)
        })
        .then(() => assert.deepStrictEqual(mockIo.end(), { stderr, stdout: "" }))
    }, Promise.resolve())
  )

  it("should warn for potential TDZ access", () => {
    const filePath = require.resolve("./fixture/cycle/tdz/a.mjs")
    const stderr = getWarning("@std/esm detected possible temporal dead zone access of 'a' in %s", filePath)

    mockIo.start()
    return import(filePath)
      .then(() => assert.deepStrictEqual(mockIo.end(), { stderr, stdout: "" }))
  })

  it("should not error when accessing `arguments` in a function", () =>
    import("./fixture/source/arguments-function.mjs")
      .then(() => assert.ok(true))
  )

  it("should not error when typeof checking `arguments`", () =>
    import("./fixture/source/arguments-typeof.mjs")
      .then(() => assert.ok(true))
  )

  it("should not error when using an opening HTML comment in CJS", () =>
    import("./fixture/source/html-comment.js")
      .then(() => assert.ok(true))
  )

  it("should not error parsing metadata of CJS modules with leading multiline comments", () =>
    import("./fixture/source/multiline-comment.js")
      .then(() => assert.ok(true))
  )

  it("should not hang on strings containing '# sourceMappingURL'", () =>
    import("./fixture/source/source-mapping-url-string.mjs")
      .then(() => assert.ok(true))
  )
})
