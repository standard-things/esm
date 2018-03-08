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
const slashRegExp = /[\\/]/g

const abcPath = path.resolve("fixture/export/abc.mjs")
const abcURL = getURLFromFilePath(abcPath)
const abcNs = createNamespace({
  a: "a",
  b: "b",
  c: "c",
  default: "default"
})

const defNs = createNamespace({
  default: { d: "d", e: "e", f: "f" }
})

const pkgPath = path.resolve("../index.js")
const pkgJSON = JSON6.parse(fs.readFileSync("../package.json"))
const pkgOptions = fs.pathExistsSync(".esmrc")
  ? JSON6.parse(fs.readFileSync(".esmrc"))
  : pkgJSON["esm"]

const stdName = "esm@" + pkgJSON.version

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

  Reflect.deleteProperty(error, "code")
  Reflect.deleteProperty(error, "name")
}

function checkErrorProps(error, code, message) {
  assert.strictEqual(error.code, code)
  assert.strictEqual(error.name, "Error [" + code + "]")
  assert.strictEqual(error.toString(), "Error [" + code + "]: " + message)

  const actual = Object.getOwnPropertyNames(error).sort()
  const expected = Object.getOwnPropertyNames(new Error("x")).sort()

  assert.deepStrictEqual(actual, expected)
  assert.deepStrictEqual(Object.keys(error), [])
  assert.deepStrictEqual(Object.getOwnPropertySymbols(error), [])
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
      "./fixture/options-file/esmrc-string-auto"
    ]
    .map((request) => import(request)))
  )

  it("should support .esmrc.json options", () =>
    Promise.all([
      "./fixture/options-file/esmrc-json-object",
      "./fixture/options-file/esmrc-json-string-auto"
    ]
    .map((request) => import(request)))
  )

  it("should support .esmrc.js options", () =>
    Promise.all([
      "./fixture/options-file/esmrc-js-object",
      "./fixture/options-file/esmrc-js-string-auto"
    ]
    .map((request) => import(request)))
  )

  it("should support .esmrc.mjs options", () =>
    Promise.all([
      "./fixture/options-file/esmrc-mjs-object",
      "./fixture/options-file/esmrc-mjs-string-auto"
    ]
    .map((request) => import(request)))
  )

  it("should support esm package options", () =>
    Promise.all([
      "./fixture/options-file/esm-object",
      "./fixture/options-file/esm-string-auto"
    ]
    .map((request) => import(request)))
  )

  it("should apply .esmrc over package.json options", () =>
    import("./fixture/options-priority")
  )

  it("should support esm as package dependencies", () =>
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

  it("should not error accessing `error.stack`", () =>
    import("./fixture/error/no-stack.mjs")
      .then(() => assert.ok(false))
      .catch((e) => {
        assert.doesNotThrow(() => e.stack)
        assert.strictEqual(e, global.customError)
      })
  )

  it("should mask stack arrows", () => {
    const id1 = path.resolve("fixture/error/end-of-input.mjs")
    const id2 = path.resolve("fixture/error/export.js")
    const id3 = path.resolve("fixture/error/import.js")
    const id4 = path.resolve("fixture/error/import.mjs")
    const id5 = path.resolve("fixture/error/missing.mjs")
    const id6 = path.resolve("fixture/error/nested.mjs")
    const id7 = path.resolve("fixture/error/syntax.js")
    const id8 = path.resolve("node_modules/error/index.js")

    return Promise.all([
      import(id1)
        .then(() => assert.ok(false))
        .catch((e) =>
          checkErrorStack(e, [
            getURLFromFilePath(id1) + ":4",
            "SyntaxError: Unexpected token"
          ].join("\n"))
        ),
      import(id4)
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
      import(id5)
        .then(() => assert.ok(false))
        .catch((e) =>
          checkErrorStack(e, [
            getURLFromFilePath(id5) + ":1",
            "SyntaxError: Module '" + abcURL + "' does not provide an export named 'NOT_EXPORTED'"
          ].join("\n"))
        ),
      import(id6)
        .then(() => assert.ok(false))
        .catch((e) =>
          checkErrorStack(e, [
            getURLFromFilePath(id6) + ":2",
            '  import"nested"',
            "  ^\n"
          ].join("\n"))
        ),
      import(id7)
        .then(() => assert.ok(false))
        .catch((e) => {
          if (pkgOptions.debug) {
            assert.ok(true)
          } else {
            checkErrorStack(e, [
              id7 + ":1",
              "syntax@error",
              "      ^\n"
            ].join("\n"))
          }
        }),
      import(id8)
        .then(() => assert.ok(false))
        .catch((e) => {
          if (pkgOptions.debug) {
            assert.ok(true)
          } else {
            checkErrorStack(e, [
              id8 + ":1",
              "syntax@error",
              "      ^\n"
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

  it("should find a file before a package", () => {
    const actual = require.resolve("./fixture/paths/file")

    assert.strictEqual(actual, path.resolve("fixture/paths/file.js"))
  })

  it("should find a package in the current directory", () =>
    [
      "./fixture/paths/file/",
      "./fixture/paths/file/."
    ]
    .forEach((request) => {
      const actual = require.resolve("./fixture/paths/file/.")

      assert.strictEqual(actual, path.resolve("fixture/paths/file/index.js"))
    })
  )

  it("should find a package in the parent directory", () => {
    const actual = require.resolve("./fixture/paths/file/a/..")

    assert.strictEqual(actual, path.resolve("fixture/paths/file/index.js"))
  })

  it("should resolve single character requests", () =>
    // Test for single character package name bug:
    // https://github.com/nodejs/node/pull/16634
    import("./fixture/import/single-char.mjs")
  )

  it('should resolve local "." requests', () =>
    Promise.all([
      "./fixture/relative/dot.js",
      "./fixture/relative/dot-slash.js"
    ].map((request) =>
      import(request)
        .then((ns) => assert.strictEqual(ns.default, "inside dot"))
    ))
  )

  it('should not resolve non-local "." requests with `require`', () => {
    try {
      require(".")
      assert.ok(false)
    } catch (e) {
      assert.strictEqual(e.code, "MODULE_NOT_FOUND")
    }
  })

  it('should not resolve non-local "." requests with `import`', () =>
    import(".")
      .then(() => assert.ok(false))
      .catch((e) => assert.strictEqual(e.code, "MODULE_NOT_FOUND"))
  )

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

  it("should not resolve non-local dependencies with `import`", () =>
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

  it("should find .mjs before .js in ESM", () =>
    Promise.all([
      "./fixture/ext-priority",
      "ext-priority"
    ].map((request) =>
      import(request)
        .then((ns) => assert.strictEqual(ns.default, "mjs"))
    ))
  )

  it("should not respect new `require.extensions` in ESM", () => {
    require.extensions[".coffee"] = require.extensions[".js"]
    return import("./fixture/cof")
      .then(() => assert.ok(false))
      .catch((e) => checkError(e, "ERR_MODULE_RESOLUTION_LEGACY"))
  })

  it("should not respect modified `require.extensions` in ESM", () => {
    require.extensions[".json"] = () => ({})
    return import("../package.json")
      .then((ns) => assert.deepStrictEqual(ns.default, pkgJSON))
  })

  it("should support URL requests in ESM", () =>
    Promise.all([
      abcPath + "?a",
      abcPath + "#a",
      abcPath.replace("abc", "%61%62%63")
    ].map((request) =>
      import(request)
        .then((ns) => assert.deepStrictEqual(ns, abcNs))
    ))
  )

  it("should support requests containing colons in ESM", () =>
    Promise.all([
      "./fixture/with:colon.mjs",
      "./fixture/with%3acolon.mjs",
      "./fixture/with%3Acolon.mjs"
    ]
    .map((request) => import(request)))
  )

  it("should support requests containing percents in ESM", () =>
    import("./fixture/with%2520percent.mjs")
  )

  it("should support requests containing pounds in ESM", () =>
    import("./fixture/with%23pound.mjs")
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
        .catch((e) => assert.strictEqual(e.code, "MODULE_NOT_FOUND"))
    ))
  )

  it("should reevaluate requests with different query+hashes", () =>
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

  it("should not reevaluate errors in ESM", () =>
    [
      "./fixture/reevaluate-error.mjs",
      "./fixture/reevaluate-error.mjs?a",
      "./fixture/reevaluate-error.mjs#a"
    ].reduce((promise, request, index) =>
      promise
        .then(() => {
          Reflect.deleteProperty(global, "evaluated")
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

  it("should not expose ESM in `module.parent`", () =>
    import("./fixture/parent/off")
      .then((ns) => {
        const parent = ns.parent
        const child = ns.child

        assert.ok(parent.parent)
        assert.ok(Reflect.has(child, "parent"))
        assert.strictEqual(typeof child.parent, "undefined")
      })
  )

  it("should expose ESM in `module.parent` with `options.cjs.cache`", () =>
    import("./fixture/parent/on")
      .then((ns) => {
        const parent = ns.parent
        const child = ns.child

        assert.ok(parent.parent)
        assert.ok(child.parent)
      })
  )

  it("should not expose ESM in `require.cache`", () => {
    const filename = path.resolve("fixture/cache/out/index.mjs")

    Reflect.deleteProperty(require.cache, filename)

    return import(filename)
      .then(() => assert.strictEqual(filename in require.cache, false))
  })

  it("should expose ESM in `require.cache` with `options.cjs.cache`", () =>
    import("./cjs/cache")
      .then((ns) => ns.default())
  )

  it('should add "__esModule" to `module.exports` of ES modules with `options.cjs.interop`', () =>
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
    import("./misc/hoist-declarations.mjs")
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

  it("should have thenable namespace objects", () =>
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

  it("should support dynamic import in CJS", () =>
    require("./fixture/import/dynamic.js")
      .then((actual) => assert.deepStrictEqual(actual, [abcNs, defNs]))
  )

  it("should support cyclical dynamic imports", () =>
    Promise.all([
      "./fixture/cycle/dynamic-import/a.js",
      "./fixture/cycle/dynamic-import/a.mjs"
    ]
    .map((request) => import(request)))
  )

  it("should support evaled dynamic import in ESM", () => {
    const code = `
      Promise.all([
        import("./fixture/export/abc.mjs"),
        import("./fixture/export/def.js")
      ])
    `

    return Promise
      .all([
        eval(code),
        (0, eval)(code)
      ].map((promise) =>
        promise
          .then((actual) => assert.deepStrictEqual(actual, [abcNs, defNs]))
      ))
  })

  it("should support evaled dynamic import in CJS", () =>
    Promise.all([
      "./fixture/eval/direct/dynamic-import.js",
      "./fixture/eval/indirect/dynamic-import.js"
    ].map((request) =>
      require(request)
        .then((actual) => assert.deepStrictEqual(actual, [abcNs, defNs]))
    ))
  )

  it("should support evaled strict mode code in ESM", () => {
    const code = `
      "use strict"
      import("path")
      ;(function() { return this })()
    `

    assert.strictEqual(typeof eval(code), "undefined")
    assert.strictEqual(typeof (0, eval)(code), "undefined")
  })

  it("should support evaled strict mode code in CJS", () => {
    [
      "./fixture/eval/direct/strict.js",
      "./fixture/eval/indirect/strict.js"
    ]
    .forEach((request) => {
      assert.strictEqual(typeof require(request), "undefined")
    })
  })

  it("should support `import.meta` in ESM", () =>
    import("./misc/import-meta.mjs")
      .then((ns) => ns.default())
  )

  it("should not support `import.meta` in CJS", () =>
    Promise.all([
      "./fixture/source/import-meta.js",
      "./fixture/eval/direct/import-meta.js",
      "./fixture/eval/indirect/import-meta.js"
    ].map((request) =>
      import(request)
        .then((ns) => assert.ok(false))
        .catch((e) => {
          assert.ok(e instanceof SyntaxError)
          assert.ok(e.message.startsWith("Cannot use 'import.meta' outside a module"))
        })
    ))
  )

  it("should not support evaled `import.meta` in ESM", () => {
    [
      () => eval("import.meta"),
      () => (0, eval)("import.meta")
    ]
    .forEach((evaler) => {
      assert.throws(
        evaler,
        SyntaxError,
        "Cannot use 'import.meta' outside a module"
      )
    })
  })

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
          Reflect.deleteProperty(global, "loadCount")
          Reflect.deleteProperty(require.cache, path.resolve("fixture/load-count.js"))
          return import(request)
        })
        .then(() => assert.strictEqual(global.loadCount, 1))
    }, Promise.resolve())
  )

  it("should not execute already loaded modules from require", () =>
    import("./fixture/load-count.js")
      .then(() => assert.strictEqual(require("./fixture/load-count.js"), 1))
  )

  it("should not error importing a non-ambiguous export", () =>
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
          assert.strictEqual(Reflect.has(global, "loadCount"), false)
          assert.strictEqual(e.code, "MODULE_NOT_FOUND")
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
          assert.strictEqual(Reflect.has(global, "loadCount"), false)
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
          "SyntaxError: Can not use keyword 'await' outside an async function"
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
      const stderr = getWarning(stdName + " detected undefined arguments access (%s): %s", data.loc, url)

      return promise
        .then(() => {
          mockIo.start()
          return import(filename)
        })
        .then(() => assert.deepStrictEqual(mockIo.end(), { stderr, stdout: "" }))
    }, Promise.resolve())
  )

  it("should warn for potential TDZ access of const or let bindings", () =>
    [
      "./fixture/cycle/tdz-const/a.mjs",
      "./fixture/cycle/tdz-let/a.mjs"
    ]
    .reduce((promise, request) => {
      const filename = path.resolve(request)
      const url = getURLFromFilePath(filename)
      const stderr = getWarning(stdName + " detected possible temporal dead zone access of 'a' in %s", url)

      return promise
        .then(() => {
          mockIo.start()
          return import(filename)
            .then(() => assert.deepStrictEqual(mockIo.end(), { stderr, stdout: "" }))
        })
    }, Promise.resolve())
  )

  it("should not warn for potential TDZ access of class or function bindings", () =>
    [
      "./fixture/cycle/tdz-class/a.mjs",
      "./fixture/cycle/tdz-function/a.mjs"
    ]
    .reduce((promise, request) =>
      promise
        .then(() => {
          mockIo.start()
          return import(request)
            .then(() => assert.deepStrictEqual(mockIo.end(), { stderr: "", stdout: "" }))
        })
    , Promise.resolve())
  )

  it("should not error accessing `arguments` in a function", () =>
    import("./fixture/source/arguments-function.mjs")
  )

  it("should not error type checking `arguments`", () =>
    import("./fixture/source/arguments-typeof.mjs")
  )

  it("should not error using an opening HTML comment in CJS", () =>
    import("./fixture/source/html-comment.js")
  )

  it("should not error parsing metadata of CJS modules with leading multiline comments", () =>
    import("./fixture/source/multiline-comment.js")
  )

  it("should not error exporting named classes", () =>
    import("./fixture/source/named-class.mjs")
  )

  it("should not hang on strings containing '# sourceMappingURL'", () =>
    import("./fixture/source/source-mapping-url-string.mjs")
  )
})
