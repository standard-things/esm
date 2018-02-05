import JSON6 from "json-6"
import SemVer from "semver"

import assert from "assert"
import createNamespace from "./create-namespace.js"
import fs from "fs-extra"
import mockIo from "mock-stdio"
import path from "path"
import require from "./require.js"
import util from "util"

const WARNING_PREFIX = "(" + process.release.name + ":" + process.pid + ") "

const isWin = process.platform === "win32"
const fileProtocol = "file://" + (isWin ? "/" : "")
const skipDecorateCheck = SemVer.satisfies(process.version, "<=4")
const slashRegExp = /[\\/]/g

const pkgPath = path.resolve("../index.js")
const pkgJSON = JSON6.parse(fs.readFileSync("../package.json"))
const pkgOptions = fs.pathExistsSync(".esmrc")
  ? JSON6.parse(fs.readFileSync(".esmrc"))
  : pkgJSON["@std/esm"]

const abcPath = path.resolve("fixture/export/abc.mjs")
const abcURL = getURLFromFilePath(abcPath)
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

function getURLFromFilePath(filename) {
  return fileProtocol + filename.replace(/\\/g, "/")
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

describe("integration", () => {
  it("should support intercepting `require`", () =>
    import("./cjs/intercept/require.js")
      .then((ns) => ns.default())
  )

  it("should support intercepting static `import`", () =>
    import("./cjs/intercept/static-import.js")
      .then((ns) => ns.default())
  )

  it("should support intercepting dynamic `import`", () =>
    import("./cjs/intercept/dynamic-import.js")
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
    ]
    .map((request) => import(request)))
  )

  it("should support .esmrc.json options", () =>
    Promise.all([
      "./fixture/options-file/esmrc-json-object",
      "./fixture/options-file/esmrc-json-string-cjs",
      "./fixture/options-file/esmrc-json-string-js"
    ]
    .map((request) => import(request)))
  )

  it("should support .esmrc.gz options", () =>
    Promise.all([
      "./fixture/options-file/esmrc-gz-object",
      "./fixture/options-file/esmrc-gz-string-cjs",
      "./fixture/options-file/esmrc-gz-string-js"
    ]
    .map((request) => import(request)))
  )

  it("should support .esmrc.js options", () =>
    Promise.all([
      "./fixture/options-file/esmrc-js-object",
      "./fixture/options-file/esmrc-js-string-cjs",
      "./fixture/options-file/esmrc-js-string-js"
    ]
    .map((request) => import(request)))
  )

  it("should support .esmrc.js.gz options", () =>
    Promise.all([
      "./fixture/options-file/esmrc-js-gz-object",
      "./fixture/options-file/esmrc-js-gz-string-cjs",
      "./fixture/options-file/esmrc-js-gz-string-js"
    ]
    .map((request) => import(request)))
  )

  it("should support .esmrc.mjs options", () =>
    Promise.all([
      "./fixture/options-file/esmrc-mjs-object",
      "./fixture/options-file/esmrc-mjs-string-cjs",
      "./fixture/options-file/esmrc-mjs-string-js"
    ]
    .map((request) => import(request)))
  )

  it("should support .esmrc.mjs.gz options", () =>
    Promise.all([
      "./fixture/options-file/esmrc-mjs-gz-object",
      "./fixture/options-file/esmrc-mjs-gz-string-cjs",
      "./fixture/options-file/esmrc-mjs-gz-string-js"
    ]
    .map((request) => import(request)))
  )

  it("should support @std/esm package options", () =>
    Promise.all([
      "./fixture/options-file/@std-esm-object",
      "./fixture/options-file/@std-esm-string-cjs",
      "./fixture/options-file/@std-esm-string-js",
      "./fixture/options-file/@std-object",
      "./fixture/options-file/@std-string-cjs",
      "./fixture/options-file/@std-string-js"
    ]
    .map((request) => import(request)))
  )

  it("should apply .esmrc over package.json options", () =>
    import("./fixture/options-priority")
  )

  it("should support @std/esm as package dependencies", () =>
    Promise.all([
      "dependencies",
      "dev-dependencies",
      "peer-dependencies"
    ]
    .map((request) => import(request)))
  )
})

describe("errors", () => {
  it("should error when `require` receives an empty `request`", () => {
    try {
      require("")
      assert.ok(false)
    } catch (e) {
      assert.strictEqual(e.code, "ERR_INVALID_ARG_VALUE")
    }
  })

  it("should error when `require` methods receive a non-string `request`", () => {
    [
      require,
      require.resolve,
      require.resolve.paths
    ]
    .forEach((func) => {
      [1, false, null, void 0, {}]
        .forEach((request) => {
          try {
            func(request)
            assert.ok(false)
          } catch (e) {
            assert.strictEqual(e.code, "ERR_INVALID_ARG_TYPE")
          }
        })
    })
  })

  it("should not wrap custom errors", () =>
    import("./fixture/error/custom.mjs")
      .then(() => assert.ok(false))
      .catch((e) => assert.strictEqual(e, global.customError))
  )

  it("should not error when accessing `error.stack`", () =>
    import("./fixture/error/no-stack.mjs")
      .then(() => assert.ok(false))
      .catch((e) => {
        assert.doesNotThrow(() => e.stack)
        assert.strictEqual(e, global.customError)
      })
  )

  it("should mask stack arrows", () => {
    const id1 = path.resolve("fixture/error/import.mjs")
    const id2 = path.resolve("fixture/error/export.js")
    const id3 = path.resolve("fixture/error/import.js")
    const id4 = path.resolve("fixture/error/missing.mjs")
    const id5 = path.resolve("fixture/error/nested.mjs")
    const id6 = path.resolve("fixture/error/syntax.js")
    const id7 = path.resolve("node_modules/error/index.js")

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
            getURLFromFilePath(id4) + ":1",
            "SyntaxError: Module '" + abcURL + "' does not provide an export named 'NOT_EXPORTED'"
          ].join("\n"))
        ),
      import(id5)
        .then(() => assert.ok(false))
        .catch((e) =>
          checkErrorStack(e, [
            getURLFromFilePath(id5) + ":2",
            '  import"nested"',
            "  ^\n"
          ].join("\n"))
        ),
      import(id6)
        .then(() => assert.ok(false))
        .catch((e) => {
          if (pkgOptions.debug) {
            assert.ok(true)
          } else {
            checkErrorStack(e, [
              id6 + ":1",
              skipDecorateCheck
                ? "SyntaxError: Unexpected token ILLEGAL"
                : "syntax@error\n\n"
            ].join("\n"))
          }
        }),
      import(id7)
        .then(() => assert.ok(false))
        .catch((e) => {
          if (pkgOptions.debug) {
            assert.ok(true)
          } else {
            checkErrorStack(e, [
              id7 + ":1",
              skipDecorateCheck
                ? "SyntaxError: Unexpected token ILLEGAL"
                : "syntax@error"
            ].join("\n"))
          }
        })
    ])
  })

  it("should mask stack traces", () =>
    import("./fixture/error/import.mjs")
      .then(() => assert.ok(false))
      .catch((e) => {
        if (pkgOptions.debug) {
          assert.ok(true)
        } else {
          assert.strictEqual(e.stack.includes(pkgPath), false)
        }
      })
  )
})

describe("Node rules", () => {
  it("should find .mjs before .js", () =>
    Promise.all([
      "./fixture/ext-priority",
      "ext-priority"
    ].map((request) =>
      import(request)
        .then((ns) => assert.strictEqual(ns.default, "mjs"))
    ))
  )

  it("should support URL requests", () =>
    Promise.all([
      abcPath + "?a",
      abcPath + "#a",
      abcPath.replace("abc", "%61%62%63")
    ].map((request) =>
      import(request)
        .then((ns) => assert.deepStrictEqual(ns, abcNs))
    ))
  )

  it("should support requests containing colons", () =>
    Promise.all([
      "./fixture/with:colon.mjs",
      "./fixture/with%3acolon.mjs",
      "./fixture/with%3Acolon.mjs"
    ]
    .map((request) => import(request)))
  )

  it("should support requests containing percents", () =>
    import("./fixture/with%2520percent.mjs")
  )

  it("should support requests containing pounds", () =>
    import("./fixture/with%23pound.mjs")
  )

  it("should support single character requests", () =>
    // Test for single character package name bug:
    // https://github.com/nodejs/node/pull/16634
    import("./fixture/import/single-char.mjs")
  )

  it('should support local "." requests', () =>
    Promise.all([
      "./fixture/relative/dot.js",
      "./fixture/relative/dot-slash.js"
    ].map((request) =>
      import(request)
        .then((ns) => assert.strictEqual(ns.default, "inside dot"))
    ))
  )

  it("should reevaluate for requests with different query+hash", () =>
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

  it("should not support URL requests with encoded slashes", () =>
    Promise.all([
      abcPath.replace(slashRegExp, "%2f"),
      abcPath.replace(slashRegExp, "%2F"),
      abcPath.replace(slashRegExp, isWin ? "%5c" : "%2f"),
      abcPath.replace(slashRegExp, isWin ? "%5C" : "%2F")
    ].map((request) =>
      import(request)
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
    ].map((request) =>
      import(request)
        .then(() => assert.ok(false))
        .catch((e) => checkError(e, "ERR_MODULE_RESOLUTION_LEGACY"))
    ))
  )

  it('should not resolve non-local "." requests', () =>
    import(".")
      .then(() => assert.ok(false))
      .catch((e) => checkError(e, "ERR_MISSING_MODULE"))
  )

  it("should not reevaluate errors", () =>
    [
      "./fixture/reevaluate-error.mjs",
      "./fixture/reevaluate-error.mjs?a",
      "./fixture/reevaluate-error.mjs#a"
    ].reduce((promise, request, index) =>
      promise
        .then(() => {
          delete global.evaluated
          return import(request)
            .then(() => assert.ok(false))
            .catch((e) =>
              import(request)
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

  it("should support requests with trailing backslashs in Windows", function () {
    if (! isWin) {
      this.skip()
      return
    }

    const request = ".\\fixture\\ext-priority\\"

    return Promise
      .resolve()
      .then(() => require(request))
      .then(() => import(request))
  })

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
    const filename = path.resolve("fixture/cache/out/index.mjs")

    delete require.cache[filename]
    return import(filename)
      .then(() => assert.strictEqual(filename in require.cache, false))
  })

  it("should expose ESM in `require.cache` with `options.cjs.cache`", () =>
    import("./cjs/cache")
      .then((ns) => ns.default())
  )

  it('should not resolve non-local "." requests with `require`', () => {
    try {
      require(".")
      assert.ok(false)
    } catch (e) {
      assert.strictEqual(e.code, "MODULE_NOT_FOUND")
    }
  })

  it("should resolve non-local dependencies with `require`", () =>
    [
      "home-node-libraries",
      "home-node-modules",
      "node-path",
      "prefix-path"
    ]
    .forEach((request) => {
      assert.ok(require(request))
    })
  )

  it("should resolve non-local dependencies with `require` in ESM", () =>
    import("./fixture/require-paths")
      .then((ns) =>
        [
          "home-node-libraries",
          "home-node-modules",
          "node-path",
          "prefix-path"
        ]
        .forEach((request) => {
          assert.ok(ns.default(request))
        })
      )
  )

  it("should resolve non-local dependencies with `require.resolve`", () =>
    [
      {
        id: "home-node-libraries",
        resolved: path.resolve("env/home/.node_libraries/home-node-libraries/index.js")
      },
      {
        id: "home-node-modules",
        resolved: path.resolve("env/home/.node_modules/home-node-modules/index.js")
      },
      {
        id: "node-path",
        resolved: path.resolve("env/node_path/node-path/index.js")
      },
      {
        id: "prefix-path",
        resolved: path.resolve("env/prefix/lib/node/prefix-path/index.js")
      }
    ]
    .forEach((data) => {
      assert.strictEqual(require.resolve(data.id), data.resolved)
    })
  )

  it("should resolve non-local dependencies with `require.resolve` in ESM", () =>
    import("./fixture/require-paths")
      .then((ns) =>
        [
          {
            id: "home-node-libraries",
            resolved: path.resolve("env/home/.node_libraries/home-node-libraries/index.js")
          },
          {
            id: "home-node-modules",
            resolved: path.resolve("env/home/.node_modules/home-node-modules/index.js")
          },
          {
            id: "node-path",
            resolved: path.resolve("env/node_path/node-path/index.js")
          },
          {
            id: "prefix-path",
            resolved: path.resolve("env/prefix/lib/node/prefix-path/index.js")
          }
        ]
        .forEach((data) => {
          assert.strictEqual(ns.default.resolve(data.id), data.resolved)
        })
      )
  )

  it("should support `options` in `require.resolve`", () => {
    const paths = [path.resolve("fixture/paths")]
    const actual = require.resolve("a", { paths })

    assert.strictEqual(actual, path.resolve("fixture/paths/node_modules/a/index.js"))
  })

  it("should support `options` in `require.resolve` in ESM", () =>
    import("./fixture/require-paths")
      .then((ns) => {
        const paths = [path.resolve("fixture/paths")]
        const actual = ns.default.resolve("a", { paths })

        assert.strictEqual(actual, path.resolve("fixture/paths/node_modules/a/index.js"))
      })
  )

  it("should support `require.resolve.paths`", () => {
    const expected = [
      path.resolve("node_modules"),
      path.resolve("../node_modules")
    ]

    const actual = require.resolve.paths("a").slice(0, 2)
    assert.deepStrictEqual(actual, expected)
  })

  it("should support `require.resolve.paths` in ESM", () =>
    import("./fixture/require-paths")
      .then((ns) => {
        const expected = [
          path.resolve("fixture/require-paths/node_modules"),
          path.resolve("fixture/node_modules"),
          path.resolve("node_modules"),
          path.resolve("../node_modules")
        ]

        const actual = ns.default.resolve.paths("a").slice(0, 4)
        assert.deepStrictEqual(actual, expected)
      })
  )

  it('should add "__esModule" to `module.exports` of ES modules with `options.cjs`', () =>
    import("./cjs/export/pseudo.mjs")
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

  it("should namespace objects should be thenable", () =>
    import("./fixture/export/thenable.mjs")
      .then((value) => assert.strictEqual(value, "thenable"))
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

  it("should support evaled dynamic import in CJS", () =>
    import("./misc/eval/dynamic.js")
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
    Promise.all([
      "./fixture/meta.js",
      "./fixture/eval/meta.js"
    ].map((request) =>
      import(request)
        .then((ns) => assert.ok(false))
        .catch((e) => {
          assert.ok(e instanceof SyntaxError)
          assert.ok(e.message.startsWith("Cannot use 'import.meta' outside a module"))
        })
    ))
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
    ].reduce((promise, request) => {
      return promise
        .then(() => {
          delete global.loadCount
          delete require.cache[path.resolve("fixture/load-count.js")]
          return import(request)
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
    ].map((request) =>
      import(request)
        .then(() => assert.ok(false))
        .catch((e) => {
          assert.ok(e instanceof SyntaxError)
          assert.ok(e.message.includes("contains conflicting star exports for name '"))
        })
    ))
  )

  it("should error with legacy code missing modules in CJS", () =>
    Promise.all([
      "./fixture/import/missing/module/cjs.js",
      "./fixture/import/missing/module/no-ext.js"
    ].map((request) =>
      import(request)
        .then(() => assert.ok(false))
        .catch((e) => assert.strictEqual(e.code, "MODULE_NOT_FOUND"))
    ))
  )

  it("should error with legacy code missing modules in CJS with `options.cjs.vars`", () =>
    Promise.all([
      "./fixture/cjs/missing/module/cjs.js",
      "./fixture/cjs/missing/module/esm.js",
      "./fixture/cjs/missing/module/no-ext.js"
    ].map((request) =>
      import(request)
        .then(() => assert.ok(false))
        .catch((e) => assert.strictEqual(e.code, "MODULE_NOT_FOUND"))
    ))
  )

  it("should error for missing modules before code execution", () =>
    Promise.all([
      "./fixture/import/missing/module/cjs.mjs",
      "./fixture/import/missing/module/esm.mjs",
      "./fixture/import/missing/module/no-ext.mjs",
      "./fixture/cycle/missing/module/a.mjs"
    ].map((request) =>
      import(request)
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
    ].map((request) =>
      import(request)
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
    ].map((request) =>
      import(request)
        .then(() => assert.ok(false))
        .catch((e) => {
          assert.ok(e instanceof TypeError)
          assert.ok(e.message.startsWith("Assignment to constant variable."))
        })
    ))
  )

  it("should error when creating an `arguments` binding", () => {
    const filename = path.resolve("fixture/source/arguments-binding.mjs")

    import(filename)
      .then(() => assert.ok(false))
      .catch((e) =>
        checkErrorStack(e, [
          getURLFromFilePath(filename) + ":1",
          "const arguments = 1",
          "      ^\n",
          "SyntaxError: Binding arguments in strict mode"
        ].join("\n"))
      )
  })

  it("should error when creating an `await` binding", () => {
    const filename = path.resolve("fixture/source/await-binding.mjs")

    return import(filename)
      .then(() => assert.ok(false))
      .catch((e) =>
        checkErrorStack(e, [
          getURLFromFilePath(filename) + ":1",
          "const await = 1",
          "      ^\n",
          "SyntaxError: The keyword 'await' is reserved"
        ].join("\n"))
      )
  })

  it("should error when exporting non-local bindings", () => {
    const filename = path.resolve("fixture/source/non-local-export.mjs")

    return import(filename)
      .then(() => assert.ok(false))
      .catch((e) =>
        checkErrorStack(e, [
          getURLFromFilePath(filename) + ":1",
          "export { global }",
          "         ^^^^^^\n",
          "SyntaxError: Export 'global' is not defined in module"
        ].join("\n"))
      )
  })

  it("should error when using top-level `new.target`", () => {
    const filename = path.resolve("fixture/source/new-target.mjs")

    return import(filename)
      .then(() => assert.ok(false))
      .catch((e) =>
        checkErrorStack(e, [
          getURLFromFilePath(filename) + ":1",
          "new.target",
          "^\n",
          "SyntaxError: new.target can only be used in functions"
        ].join("\n"))
      )
  })

  it("should error when using an opening HTML comment in ESM", () => {
    const filename = path.resolve("fixture/source/html-comment.mjs")

    return import(filename)
      .then(() => assert.ok(false))
      .catch((e) =>
        checkErrorStack(e, [
          getURLFromFilePath(filename) + ":1",
          "<!--",
          "^\n",
          "SyntaxError: HTML comments are not allowed in modules"
        ].join("\n"))
      )
   })

  it("should warn when creating an `arguments` binding", () =>
    [
      { id: "fixture/source/arguments-undefined.mjs", loc: "1:0" },
      { id: "fixture/source/arguments-undefined-nested.mjs", loc: "2:2" }
    ].reduce((promise, data) => {
      const filename = path.resolve(data.id)
      const url = getURLFromFilePath(filename)
      const stderr = getWarning("@std/esm detected undefined arguments access (%s): %s", data.loc, url)

      return promise
        .then(() => {
          mockIo.start()
          return import(filename)
        })
        .then(() => assert.deepStrictEqual(mockIo.end(), { stderr, stdout: "" }))
    }, Promise.resolve())
  )

  it("should warn for potential TDZ access", () => {
    const filename = path.resolve("fixture/cycle/tdz/a.mjs")
    const url = getURLFromFilePath(filename)
    const stderr = getWarning("@std/esm detected possible temporal dead zone access of 'a' in %s", url)

    mockIo.start()
    return import(filename)
      .then(() => assert.deepStrictEqual(mockIo.end(), { stderr, stdout: "" }))
  })

  it("should not error when accessing `arguments` in a function", () =>
    import("./fixture/source/arguments-function.mjs")
  )

  it("should not error when typeof checking `arguments`", () =>
    import("./fixture/source/arguments-typeof.mjs")
  )

  it("should not error when using an opening HTML comment in CJS", () =>
    import("./fixture/source/html-comment.js")
  )

  it("should not error parsing metadata of CJS modules with leading multiline comments", () =>
    import("./fixture/source/multiline-comment.js")
  )

  it("should not hang on strings containing '# sourceMappingURL'", () =>
    import("./fixture/source/source-mapping-url-string.mjs")
  )
})
