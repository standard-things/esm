import { Console } from "console"
import JSON6 from "json-6"
import Module from "module"
import SemVer from "semver"

import assert from "assert"
import createNamespace from "./create-namespace.js"
import fs from "fs-extra"
import * as fsExtraNs from "fs-extra"
import * as fsNs from "fs"
import path from "path"
import require from "./require.js"
import stream from "stream"
import util from "util"

const ESM_OPTIONS = JSON6.parse(process.env.ESM_OPTIONS || "{}")

const isDebug = !! ESM_OPTIONS.debug
const isV8 = Reflect.has(process.versions, "v8")
const isWin = process.platform === "win32"

const canTestBridgeExports = isV8
const canTestDuplexInstance = SemVer.satisfies(process.version, ">=6.8.0")
const canTestHasInstance = SemVer.satisfies(process.version, ">=6.5.0")
const canTestUtilTypes = Reflect.has(util, "types")

const fileProtocol = "file://" + (isWin ? "/" : "")
const slashRegExp = /[\\/]/g

const pkgPath = path.resolve("../index.js")
const pkgJSON = fs.readJSONSync("../package.json")

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

  const sampleError = new Error("x")
  const actual = Object.getOwnPropertyNames(error).sort()
  const expected = Object.getOwnPropertyNames(sampleError).sort()

  assert.deepStrictEqual(actual, expected)
  assert.deepStrictEqual(Object.keys(error), [])
  assert.deepStrictEqual(Object.getOwnPropertySymbols(error), [])
}

function checkErrorStack(error, startsWith) {
  const stack = error.stack.replace(/\r\n/g, "\n")

  assert.ok(stack.startsWith(startsWith) || stack.startsWith("SyntaxError:"))
}

function checkLegacyErrorProps(error, code) {
  assert.strictEqual(error.code, code)
  assert.strictEqual(error.name, "Error")
  assert.strictEqual(error.toString(), "Error: " + error.message)

  const sampleError = new Error("x")

  sampleError.code = "ERR_CODE"

  const actual = Object.getOwnPropertyNames(error).sort()
  const expected = Object.getOwnPropertyNames(sampleError).sort()

  assert.deepStrictEqual(actual, expected)
  assert.deepStrictEqual(Object.keys(error), ["code"])
  assert.deepStrictEqual(Object.getOwnPropertySymbols(error), [])
}

function getURLFromFilePath(filename) {
  return fileProtocol + filename.replace(/\\/g, "/")
}

describe("miscellaneous tests", () => {
  describe("builtin modules", () => {
    it("should load builtin modules", () =>
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

    it("should support `console.Console`", () => {
      const actual = new Console(process.stdout)

      assert.ok(actual instanceof Console)
    })

    it("should support subclassing `console.Console`", () => {
      class Sub extends Console {
        constructor(...args) {
          super(...args)
          this.sub = "sub"
        }
      }

      const actual = new Sub(process.stdout)

      assert.ok(actual instanceof Console)
      assert.ok(actual instanceof Sub)

      assert.strictEqual(actual.sub, "sub")
      assert.ok(Reflect.has(actual, "_stdout"))
    })

    it("should support subclassing `stream.Stream`", () => {
      const Ctors = [
        stream,
        stream.Duplex,
        stream.Readable,
        stream.Stream,
        stream.Transform,
        stream.Writable
      ]

      Ctors.forEach((Ctor, index) => {
        class Sub extends Ctor {
          constructor(...args) {
            super(...args)
            this.sub = "sub"
          }
        }

        const actual = new Sub

        assert.strictEqual(actual.sub, "sub")
        assert.ok(Reflect.has(actual, "domain"))

        assert.ok(actual instanceof Ctor)
        assert.ok(actual instanceof Sub)

        if (canTestHasInstance) {
          if (canTestDuplexInstance &&
              Ctor === stream.Duplex) {
            assert.ok(actual instanceof stream.Writable)
          }

          assert.ok(actual instanceof stream)
        }
      })
    })

    it("should support `util.types.isModuleNamespaceObject`", function () {
      if (! canTestUtilTypes) {
        this.skip()
      }

      const { isModuleNamespaceObject } = util.types

      assert.strictEqual(isModuleNamespaceObject(fsNs), true)
      assert.strictEqual(isModuleNamespaceObject(abcNs), false)
      assert.strictEqual(isModuleNamespaceObject(1), false)
      assert.strictEqual(isModuleNamespaceObject(), false)
    })

    it("should support `util.types.isProxy`", function () {
      if (! canTestUtilTypes) {
        this.skip()
      }

      const { isProxy } = util.types

      assert.strictEqual(isProxy(new Proxy({}, {})), true)
      assert.strictEqual(isProxy(fsNs), false)
      assert.strictEqual(isProxy(util), false)
      assert.strictEqual(isProxy(1), false)
      assert.strictEqual(isProxy(), false)
    })
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

    it("should support ESM in `Module#_compile`", () => {
      const mod = new Module

      mod._compile('export const a = "a"', "filename")

      assert.deepStrictEqual(mod.exports, {})

      mod.loaded = true

      assert.deepEqual(mod.exports, { a: "a" })
    })
  })

  describe("package.json", () => {
    it("should be enabled for third-party packages", () =>
      import("third-party")
    )

    it("should support .esmrc options", () =>
      [
        "./fixture/options-file/esmrc-object",
        "./fixture/options-file/esmrc-string"
      ]
      .reduce((promise, request) =>
        promise
          .then(() => import(request))
          .then(assert.fail)
          .catch((e) => assert.ok(e instanceof SyntaxError))
      , Promise.resolve())
    )

    it("should support .esmrc.json options", () =>
      [
        "./fixture/options-file/esmrc-json-object",
        "./fixture/options-file/esmrc-json-string"
      ]
      .reduce((promise, request) =>
        promise
          .then(() => import(request))
          .then(assert.fail)
          .catch((e) => assert.ok(e instanceof SyntaxError))
      , Promise.resolve())
    )

    it("should support .esmrc.js options", () =>
      [
        "./fixture/options-file/esmrc-js-object",
        "./fixture/options-file/esmrc-js-string"
      ]
      .reduce((promise, request) =>
        promise
          .then(() => import(request))
          .then(assert.fail)
          .catch((e) => assert.ok(e instanceof SyntaxError))
      , Promise.resolve())
    )

    it("should support .esmrc.mjs options", () =>
      import("./fixture/options-file/esmrc-mjs")
        .then(assert.fail)
        .catch((e) => assert.ok(e instanceof SyntaxError))
    )

    it("should support esm package options", () =>
      [
        "./fixture/options-file/esm-object",
        "./fixture/options-file/esm-string"
      ]
      .reduce((promise, request) =>
        promise
          .then(() => import(request))
          .then(assert.fail)
          .catch((e) => assert.ok(e instanceof SyntaxError))
      , Promise.resolve())
    )

    it("should apply .esmrc over package.json options", () =>
      import("./fixture/options-priority")
    )

    it("should support esm as package dependencies", () =>
      Promise
        .all([
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
        assert.fail()
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
              assert.fail()
            } catch (e) {
              assert.strictEqual(e.code, "ERR_INVALID_ARG_TYPE")
            }
          })
      })
    })

    it("should not wrap custom errors", () =>
      import("./fixture/error/custom.mjs")
        .then(assert.fail)
        .catch((e) => assert.strictEqual(e, global.customError))
    )

    it("should not error accessing `error.stack`", () =>
      import("./fixture/error/no-stack.mjs")
        .then(assert.fail)
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

      return Promise
        .all([
          import(id1)
            .then(assert.fail)
            .catch((e) =>
              checkErrorStack(e, [
                getURLFromFilePath(id1) + ":4",
                "SyntaxError: Unexpected end of input"
              ].join("\n"))
            ),
          import(id4)
            .then(assert.fail)
            .catch((e) =>
              checkErrorStack(e, [
                id2 + ":1",
                'export const a = "a"',
                "^\n"
              ].join("\n"))
            ),
          import(id3)
            .then(assert.fail)
            .catch((e) =>
              checkErrorStack(e, [
                id3 + ":1",
                'import { a } from "./export.js"',
                "       ^\n",
                "SyntaxError: Unexpected token {"
              ].join("\n"))
            ),
          import(id5)
            .then(assert.fail)
            .catch((e) =>
              checkErrorStack(e, [
                getURLFromFilePath(id5) + ":1",
                "SyntaxError: Missing export name 'NOT_EXPORTED' in ES module: " + abcURL
              ].join("\n"))
            ),
          import(id6)
            .then(assert.fail)
            .catch((e) =>
              checkErrorStack(e, [
                getURLFromFilePath(id6) + ":2",
                '  import"nested"',
                "        ^\n",
                "SyntaxError: Unexpected string"
              ].join("\n"))
            ),
          import(id7)
            .then(assert.fail)
            .catch((e) => {
              if (isDebug) {
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
            .then(assert.fail)
            .catch((e) => {
              if (isDebug) {
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
        .then(assert.fail)
        .catch((e) => assert.strictEqual(e.stack.includes(pkgPath), false))
    )
  })

  describe("Node rules", () => {
    it("should support requests with trailing backslashes in Windows", function () {
      if (! isWin) {
        this.skip()
      }

      const request = ".\\node_modules\\ext-priority\\"

      assert.doesNotThrow(() => require(request))

      return import(request)
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
      Promise
        .all([
          "./fixture/relative/dot.js",
          "./fixture/relative/dot-slash.js"
        ]
        .map((request) =>
          import(request)
            .then((ns) => assert.strictEqual(ns.default, "inside dot"))
        ))
    )

    it('should not resolve non-local "." requests with `require`', () => {
      try {
        require(".")
        assert.fail()
      } catch (e) {
        checkLegacyErrorProps(e, "MODULE_NOT_FOUND")
      }
    })

    it('should not resolve non-local "." requests with `import`', () =>
      import(".")
        .then(assert.fail)
        .catch((e) => checkLegacyErrorProps(e, "MODULE_NOT_FOUND"))
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
      Promise
        .all([
          "home-node-libraries",
          "home-node-modules",
          "node-path",
          "prefix-path"
        ]
        .map((request) =>
          import(request)
            .then(assert.fail)
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

    it("should find `.mjs` before `.js` in ESM", () =>
      Promise
        .all([
          "./fixture/ext/priority",
          "ext-priority"
        ]
        .map((request) =>
          import(request)
            .then((ns) => assert.strictEqual(ns.default, ".mjs"))
        ))
    )

    it("should find `.js` before `.mjs` with `options.cjs.paths`", () =>
      import("./cjs/ext/priority.js")
        .then((ns) => ns.default())
    )

    it("should support modified `require.extensions` in CJS", () => {
      require.extensions[".mjs"] = () => ({})

      Reflect.deleteProperty(require.cache, abcPath)

      assert.doesNotThrow(() => require(abcPath))

      require.extensions[".mjs"] = require.extensions[".js"]

      Reflect.deleteProperty(require.cache, abcPath)

      assert.throws(() => require(abcPath), SyntaxError)
    })

    it("should not support modified `require.extensions` in ESM", () => {
      const filename = path.resolve("../package.json")

      require.extensions[".json"] = () => ({})

      Reflect.deleteProperty(require.cache, filename)

      return import(filename)
        .then((ns) => assert.deepStrictEqual(ns.default, pkgJSON))
    })

    it("should not support new `require.extensions` in ESM", () => {
      const filename = path.resolve("./fixture/cof")

      require.extensions[".coffee"] = require.extensions[".js"]

      Reflect.deleteProperty(require.cache, filename)

      return import(filename)
        .then(assert.fail)
        .catch((e) => checkError(e, "ERR_MODULE_RESOLUTION_LEGACY"))
    })

    it("should support requests with URL query/fragments in ESM", () =>
      Promise
        .all([
          abcPath + "?a",
          abcPath + "#a",
          abcPath.replace("abc", "%61%62%63"),
          abcURL + "?a",
          abcURL + "#a",
          abcURL.replace("abc", "%61%62%63")
        ]
        .map((request) =>
          import(request)
            .then((ns) => assert.deepStrictEqual(ns, abcNs))
        ))
    )

    it("should support requests containing carriage returns in ESM", () =>
      Promise
        .all([
          "./fixture/with\rcarriage-return.mjs",
          "./fixture/with%0Dcarriage-return.mjs",
          "./fixture/with%0dcarriage-return.mjs"
        ]
        .map((request) => import(request)))
    )

    it("should support requests containing colons in ESM", () =>
      Promise
        .all([
          "./fixture/with:colon.mjs",
          "./fixture/with%3Acolon.mjs",
          "./fixture/with%3acolon.mjs"
        ]
        .map((request) => import(request)))
    )

    it("should support requests containing hash signs in ESM", () =>
      import("./fixture/with%23hash.mjs")
    )

    it("should support requests containing newlines in ESM", () =>
      Promise
        .all([
          "./fixture/with\nnewline.mjs",
          "./fixture/with%0Anewline.mjs",
          "./fixture/with%0anewline.mjs"
        ]
        .map((request) => import(request)))
    )

    it("should support requests containing percent encodings in ESM", () =>
      import("./fixture/with%2520percent.mjs")
    )

    it("should support builtin module specifiers with percent encodings", () =>
      import("%66%73")
        .then((ns) => assert.deepStrictEqual(ns, fsNs))
    )

    it("should support bare module specifiers with percent encodings", () =>
      import("%66%73-extra")
        .then((ns) => assert.deepStrictEqual(ns, fsExtraNs))
    )

    it("should support requests containing tabs in ESM", () =>
      Promise
        .all([
          "./fixture/with\ttab.mjs",
          "./fixture/with%09tab.mjs"
        ]
        .map((request) => import(request)))
    )

    it("should not support builtin module specifiers with URL query/fragments", () =>
      Promise
        .all([
          "fs?a",
          "fs#a",
          "fs?a#a",
          "%66%73?a#a"
        ]
        .map((request) =>
          import(request)
            .then(assert.fail)
            .catch((e) => checkLegacyErrorProps(e, "MODULE_NOT_FOUND"))
        ))
    )

    it("should not support bare module specifiers with URL query/fragments", () =>
      Promise
        .all([
          "fs-extra?a",
          "fs-extra#a",
          "fs-extra?a#a",
          "%66%73-extra?a#a"
        ]
        .map((request) =>
          import(request)
            .then(assert.fail)
            .catch((e) => checkLegacyErrorProps(e, "MODULE_NOT_FOUND"))
        ))
    )

    it("should not support requests with encoded slashes", () => {
      const requests = [
        abcPath.replace(slashRegExp, "%2F"),
        abcPath.replace(slashRegExp, "%2f"),
        abcURL.replace(slashRegExp, "%2F"),
        abcURL.replace(slashRegExp, "%2f")
      ]

      if (isWin) {
        requests.unshift(
          abcPath.replace(slashRegExp, "%5C"),
          abcPath.replace(slashRegExp, "%5c")
        )
      }

      return Promise
        .all(
          requests
            .map((request) =>
              import(request)
                .then(assert.fail)
                .catch((e) => {
                  if (isWin &&
                      ! request.startsWith("file:")) {
                    checkError(e, "ERR_INVALID_PROTOCOL")
                  } else {
                    checkLegacyErrorProps(e, "MODULE_NOT_FOUND")
                  }
                })
            )
        )
    })

    it("should support URL query/fragments with encoded slashes", () => {
      const encodedLower = isWin ? "%5cc" : ""
      const encodedUpper = isWin ? "%5Cc" : ""

      return Promise
        .all([
          abcPath + "?a%2Fb" + encodedUpper,
          abcPath + "?a%2fb" + encodedLower,
          abcPath + "#a%2Fb" + encodedUpper,
          abcPath + "#a%2fb" + encodedLower,
          abcURL + "?a%2Fb" + encodedUpper,
          abcURL + "?a%2fb" + encodedLower,
          abcURL + "#a%2Fb" + encodedUpper,
          abcURL + "#a%2fb" + encodedLower
        ]
        .map((request) =>
          import(request)
            .then((ns) => assert.deepStrictEqual(ns, abcNs))
        ))
    })

    it("should reevaluate requests with different URL query/fragments", () =>
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
          ]
          .reduce((promise, data) =>
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
      ]
      .reduce((promise, request) =>
        promise
          .then(() => {
            Reflect.deleteProperty(global, "loadCount")
            return import(request)
              .then(assert.fail)
              .catch((e) =>
                import(request)
                  .then(assert.fail)
                  .catch((re) => {
                    if (re.code === "ERR_ASSERTION") {
                      assert.fail()
                    } else {
                      assert.strictEqual(e, re)
                      assert.strictEqual(global.loadCount, 1)
                    }
                  })
              )
            })
      , Promise.resolve())
    )

    it("should not expose ESM in `module.parent`", () =>
      import("./fixture/options/cjs-cache/parent/off/parent.js")
        .then(({ child, parent }) => {
          assert.ok(parent.parent)
          assert.ok(Reflect.has(child, "parent"))
          assert.strictEqual(typeof child.parent, "undefined")
        })
    )

    it("should expose ESM in `module.parent` with `options.cjs.cache`", () =>
      import("./fixture/options/cjs-cache/parent/on/parent.js")
        .then(({ child, parent }) => {
          assert.ok(parent.parent)
          assert.ok(child.parent)
        })
    )

    it("should not expose ESM in `module.parent` with `options.cjs.cache` in `.mjs` files", () =>
      import("./fixture/options/cjs-cache/parent/on/parent.mjs")
        .then(({ child }) => {
          assert.ok(Reflect.has(child, "parent"))
          assert.strictEqual(typeof child.parent, "undefined")
        })
    )

    it("should not expose ESM in `require.cache`", () => {
      const filename = path.resolve("fixture/options/cjs-cache/require/out/index.js")

      Reflect.deleteProperty(require.cache, filename)

      return import(filename)
        .then(() => assert.strictEqual(Reflect.has(require.cache, filename), false))
    })

    it("should expose ESM in `require.cache` with `options.cjs.cache`", () => {
      const filename = path.resolve("fixture/options/cjs-cache/require/in/index.js")

      Reflect.deleteProperty(require.cache, filename)

      return import(filename)
        .then(() => assert.strictEqual(Reflect.has(require.cache, filename), true))
    })

    it("should add `module.exports.__esModule` to ES modules with `options.cjs.interop`", () => {
      const exported = require("./fixture/cjs/export/nothing.js")
      const descriptor = Reflect.getOwnPropertyDescriptor(exported, "__esModule")

      assert.deepStrictEqual(descriptor, {
        configurable: false,
        enumerable: false,
        value: true,
        writable: false
      })
    })

    it("should treat pseudo modules as CJS in `.mjs` files", () =>
      Promise
        .all([
          import("./fixture/export/star-pseudo.mjs")
            .then((ns) => {
              assert.deepStrictEqual(ns, createNamespace({}))
            }),
          import("./fixture/export/default/pseudo.mjs")
            .then((ns) => {
              assert.deepStrictEqual(ns, createNamespace({
                default: {
                  a: "a",
                  default: "default"
                }
              }))
            })
        ])
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
      import("./misc/order")
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

    it("should load CJS modules that delete their cache entry", () => {
      return import("./fixture/delete-cache.js")
        .then((ns) => assert.strictEqual(ns.default, "delete cache"))
    })

    it("should support dynamic import in CJS", () =>
      require("./fixture/import/dynamic.js")
        .then((actual) => assert.deepStrictEqual(actual, [abcNs, defNs]))
    )

    it("should support cyclical dynamic imports", () =>
      Promise
        .all([
          "./fixture/cycle/dynamic-import/a.js",
          "./fixture/cycle/dynamic-import/a.mjs"
        ]
        .map((request) => import(request)))
    )

    it("should detect cycles while resolving export names", () =>
      Promise
        .all([
          import("./fixture/cycle/detected/direct/a.mjs")
            .then(assert.fail)
            .catch((e) => {
              assert.ok(e instanceof SyntaxError)
              assert.strictEqual(
                e.message,
                "Detected cycle while resolving name 'x2' in ES module: " +
                getURLFromFilePath(path.resolve("fixture/cycle/detected/direct/b.mjs"))
              )
            }),
          import("./fixture/cycle/detected/indirect/a.mjs")
            .then(assert.fail)
            .catch((e) => {
              assert.ok(e instanceof SyntaxError)
              assert.strictEqual(
                e.message,
                "Missing export name 'x2' in ES module: " +
                getURLFromFilePath(path.resolve("fixture/cycle/detected/indirect/b.mjs"))
              )
            }),
          import("./fixture/cycle/detected/self/a.mjs")
            .then(assert.fail)
            .catch((e) => {
              assert.ok(e instanceof SyntaxError)
              assert.strictEqual(
                e.message,
                "Detected cycle while resolving name 'x' in ES module: " +
                getURLFromFilePath(path.resolve("fixture/cycle/detected/self/a.mjs"))
              )
            })
        ])
    )

    it("should support evaled dynamic import in ESM", () => {
      const code = `
        Promise
          .all([
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
      Promise
        .all([
          "./fixture/eval/direct/dynamic-import.js",
          "./fixture/eval/indirect/dynamic-import.js"
        ]
        .map((request) =>
          require(request)
            .then((actual) => assert.deepStrictEqual(actual, [abcNs, defNs]))
        ))
    )

    it("should support evaled strict mode code in ESM", () => {
      const code = `
        "use strict"
        import("path")
        ;(function () {
          return this
        })()
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
      Promise
        .all([
          "./fixture/source/import-meta.js",
          "./fixture/eval/direct/import-meta.js",
          "./fixture/eval/indirect/import-meta.js"
        ]
        .map((request) =>
          import(request)
            .then(assert.fail)
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

    it("should not have CJS free variables in `.mjs` files", () =>
      import("./misc/free-vars.mjs")
        .then((ns) => ns.default())
    )

    it("should not import CJS bindings in `.mjs` files", () =>
      import("./fixture/import/cjs-bindings.mjs")
        .then(assert.fail)
        .catch((e) => {
          assert.ok(e instanceof SyntaxError)
          assert.ok(e.message.startsWith("Missing export"))
        })
    )

    it("should not support loading ESM files from `require`", () =>
      Promise
        .all([
          import("./fixture/require-esm/strict/js.js")
            .then(assert.fail)
            .catch((e) => assert.ok(e instanceof SyntaxError)),
          import("./fixture/require-esm/strict/mjs.js")
            .then(assert.fail)
            .catch((e) => checkError(e, "ERR_REQUIRE_ESM"))
        ])
    )

    it("should not support loading preloaded ESM files from `require`", () =>
      Promise
        .all([
          import("./fixture/export/abc.js"),
          import("./fixture/export/abc.mjs")
        ])
        .then(() =>
          Promise
            .all([
              import("./fixture/require-esm/strict/js.js")
                .then(assert.fail)
                .catch((e) => assert.ok(e instanceof SyntaxError)),
              import("./fixture/require-esm/strict/mjs.js")
                .then(assert.fail)
                .catch((e) => checkError(e, "ERR_REQUIRE_ESM"))
            ])
        )
    )

    it("should support loading `.js` ESM files from `require` with `options.cjs`", () =>
      import("./fixture/require-esm/cjs/js.js")
    )

    it("should not support loading `.mjs` files from `require` with `options.cjs`", () =>
      import("./fixture/require-esm/cjs/mjs.js")
        .then(assert.fail)
        .catch((e) => checkError(e, "ERR_REQUIRE_ESM"))
    )

    it("should not execute already loaded modules", () =>
      [
        "./fixture/cjs/load-count",
        "./fixture/cycle/load-count/a.js",
        "./fixture/cycle/load-count/a.mjs"
      ]
      .reduce((promise, request) =>
        promise
          .then(() => {
            Reflect.deleteProperty(global, "loadCount")
            Reflect.deleteProperty(require.cache, path.resolve("fixture/load-count.js"))
            return import(request)
          })
          .then(() => assert.strictEqual(global.loadCount, 1))
      , Promise.resolve())
    )

    it("should not execute already loaded modules from `require`", () =>
      import("./fixture/load-count.js")
        .then(() => assert.strictEqual(require("./fixture/load-count.js"), 1))
    )

    it("should not error importing a non-ambiguous export", () =>
      import("./misc/import/non-ambiguous.mjs")
        .then((ns) => ns.default())
    )

    it("should not break class invocations when checking for TDZ violations", () =>
      import("./fixture/cycle/class/a.mjs")
    )

    it("should not throw TDZ errors for unaccessed bindings", () =>
      [
        "./fixture/cycle/tdz/no-access/class/a.mjs",
        "./fixture/cycle/tdz/no-access/const/a.mjs",
        "./fixture/cycle/tdz/no-access/function/a.mjs",
        "./fixture/cycle/tdz/no-access/let/a.mjs",
        "./fixture/cycle/tdz/no-access/namespace/a.mjs"
      ]
      .reduce((promise, request) =>
        promise
          .then(() => import(request))
      , Promise.resolve())
    )

    it("should not throw TDZ errors for accessed function declaration bindings", () =>
      import("./fixture/cycle/tdz/access/function/a.mjs")
    )

    it("should throw TDZ errors for accessed bindings", () =>
      [
        "./fixture/cycle/tdz/access/class/a.mjs",
        "./fixture/cycle/tdz/access/const/a.mjs",
        "./fixture/cycle/tdz/access/let/a.mjs",
        "./fixture/cycle/tdz/access/namespace/a.mjs"
      ]
      .reduce((promise, request) =>
        promise
          .then(() => import(request))
          .then(assert.fail)
          .catch((e) => assert.ok(e instanceof ReferenceError))
      , Promise.resolve())
    )

    it("should error when exporting duplicate local bindings", () =>
      import("./fixture/export/dup-local.mjs")
        .then(assert.fail)
        .catch((e) => {
          assert.ok(e instanceof SyntaxError)
          assert.ok(e.message.startsWith("Duplicate export"))
        })
    )

    it("should error when importing or re-exporting a conflicted star exports", () =>
      Promise
        .all([
          "./fixture/import/star-conflict.js",
          "./fixture/import/star-conflict.mjs",
          "./fixture/export/star-conflict.js",
          "./fixture/export/star-conflict.mjs"
        ]
        .map((request) =>
          import(request)
            .then(assert.fail)
            .catch((e) => {
              assert.ok(e instanceof SyntaxError)
              assert.ok(e.message.startsWith("Conflicting indirect export"))
            })
        ))
    )

    it("should error with legacy code missing modules in CJS", () =>
      Promise
        .all([
          "./fixture/import/missing/module/cjs.js",
          "./fixture/import/missing/module/no-ext.js"
        ]
        .map((request) =>
          import(request)
            .then(assert.fail)
            .catch((e) => checkLegacyErrorProps(e, "MODULE_NOT_FOUND"))
        ))
    )

    it("should error with legacy code missing modules in CJS with `options.cjs.vars`", () =>
      Promise
        .all([
          "./fixture/cjs/missing/module/cjs.js",
          "./fixture/cjs/missing/module/esm.js",
          "./fixture/cjs/missing/module/no-ext.js"
        ]
        .map((request) =>
          import(request)
            .then(assert.fail)
            .catch((e) => checkLegacyErrorProps(e, "MODULE_NOT_FOUND"))
        ))
    )

    it("should error for missing modules before ESM code execution", () =>
      Promise
        .all([
          "./fixture/import/missing/module/cjs.mjs",
          "./fixture/import/missing/module/esm.mjs",
          "./fixture/import/missing/module/no-ext.mjs",
          "./fixture/cycle/missing/module/a.mjs"
        ]
        .map((request) =>
          import(request)
            .then(assert.fail)
            .catch((e) => {
              assert.strictEqual(Reflect.has(global, "loadCount"), false)
              checkLegacyErrorProps(e, "MODULE_NOT_FOUND")
            })
        ))
    )

    it("should error when importing non-exported binding before ESM code execution", () =>
      Promise
        .all([
        "./fixture/import/missing/export/cjs.mjs",
        "./fixture/import/missing/export/esm.mjs",
        "./fixture/cjs/missing/export/esm.js",
        "./fixture/cycle/missing/export/a.mjs"
        ]
        .map((request) =>
          import(request)
            .then(assert.fail)
            .catch((e) => {
              assert.strictEqual(Reflect.has(global, "loadCount"), false)
              assert.ok(e.message.startsWith("Missing export name 'NOT_EXPORTED'"))
            })
        ))
    )

    it("should error when importing non-exported binding after CJS code execution", () =>
      Promise
        .all([
          "./fixture/cjs/missing/export/cjs.js",
          "./fixture/cjs/missing/export/bridge.js"
        ]
        .map((request) =>
          import(request)
            .then(assert.fail)
            .catch((e) => {
              assert.strictEqual(global.loadCount, 1)

              if (canTestBridgeExports) {
                assert.ok(e.message.startsWith("Missing export name 'NOT_EXPORTED'"))
              } else {
                assert.ok(true)
              }
            })
        ))
    )

    it("should error when setting an imported identifier", () =>
      Promise
        .all([
          "./fixture/import/const.mjs",
          "./fixture/import/let.mjs"
        ]
        .map((request) =>
          import(request)
            .then(assert.fail)
            .catch((e) => {
              assert.ok(e instanceof TypeError)
              assert.ok(e.message.startsWith("Assignment to constant variable."))
            })
        ))
    )

    it("should error when creating an `arguments` binding", () => {
      const filename = path.resolve("fixture/source/arguments-binding.mjs")

      return import(filename)
        .then(assert.fail)
        .catch((e) =>
          checkErrorStack(e, [
            getURLFromFilePath(filename) + ":1",
            "const arguments = 1",
            "      ^\n",
            "SyntaxError: Unexpected eval or arguments in strict mode"
          ].join("\n"))
        )
    })

    it("should error when creating an `await` binding", () => {
      const filename = path.resolve("fixture/source/await-binding.mjs")

      return import(filename)
        .then(assert.fail)
        .catch((e) =>
          checkErrorStack(e, [
            getURLFromFilePath(filename) + ":1",
            "const await = 1",
            "      ^\n",
            "SyntaxError: await is only valid in async function"
          ].join("\n"))
        )
    })

    it("should error when exporting non-local bindings", () => {
      const filename = path.resolve("fixture/source/non-local-export.mjs")

      return import(filename)
        .then(assert.fail)
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
        .then(assert.fail)
        .catch((e) =>
          checkErrorStack(e, [
            getURLFromFilePath(filename) + ":1",
            "new.target",
            "^\n",
            "SyntaxError: new.target expression is not allowed here"
          ].join("\n"))
        )
    })

    it("should error when using an opening HTML comment in ESM", () => {
      const filename = path.resolve("fixture/source/html-comment.mjs")

      return import(filename)
        .then(assert.fail)
        .catch((e) =>
          checkErrorStack(e, [
            getURLFromFilePath(filename) + ":1",
            "<!--",
            "^\n",
            "SyntaxError: HTML comments are not allowed in modules"
          ].join("\n"))
        )
    })

    it("should error when accessing an `arguments` binding", () => {
      const id1 = path.resolve("fixture/source/arguments-top-level.mjs")
      const id2 = path.resolve("fixture/source/arguments-nested.mjs")

      return Promise
        .all([
          import(id1)
            .then(assert.fail)
            .catch((e) => {
              if (isDebug) {
                assert.ok(true)
              } else {
                checkErrorStack(e, [
                  getURLFromFilePath(id1) + ":1",
                  "arguments",
                  "",
                  "ReferenceError: arguments is not defined"
                ].join("\n"))
              }
            }),
          import(id2)
            .then(assert.fail)
            .catch((e) => {
              if (isDebug) {
                assert.ok(true)
              } else {
                checkErrorStack(e, [
                  getURLFromFilePath(id2) + ":2",
                  "  arguments",
                  "",
                  "ReferenceError: arguments is not defined"
                ].join("\n"))
              }
            })
        ])
    })

    it("should not error accessing `arguments` in a function", () =>
      import("./fixture/source/arguments-function.mjs")
    )

    it("should not error type checking `arguments`", () =>
      import("./fixture/source/arguments-typeof.mjs")
    )

    it("should not error using an opening HTML comment in CJS", () =>
      import("./fixture/source/html-comment.js")
    )

    it("should not error exporting named classes", () =>
      import("./fixture/source/named-class.mjs")
    )

    it("should not error on side effect only ES modules with shebangs", () =>
      import("./fixture/source/shebang.mjs")
    )

    it("should not hang on strings containing '# sourceMappingURL'", () =>
      import("./fixture/source/source-mapping-url-string.mjs")
    )
  })
})
