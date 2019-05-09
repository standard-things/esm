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
import resetState from "./reset-state.js"
import stream from "stream"
import trash from "../script/trash.js"
import util from "util"

const ESM_OPTIONS = JSON6.parse(process.env.ESM_OPTIONS || "{}")

const isDebug = !! ESM_OPTIONS.debug
const isWin = process.platform === "win32"

const canTestDuplexInstance = SemVer.satisfies(process.version, ">=6.8")
const canTestHasInstance = SemVer.satisfies(process.version, ">=6.5")
const canTestUtilFormatWithOptions = Reflect.has(util, "formatWithOptions")
const canTestUtilTypes = Reflect.has(util, "types")
const canTestWorker = SemVer.satisfies(process.version, ">=10.5")

const fileProtocol = "file://" + (isWin ? "/" : "")
const slashRegExp = /[\\/]/g

const indexPath = path.resolve("../index.js")
const pkgJSON = fs.readJSONSync("../package.json")

const abcPath = path.resolve("fixture/export/abc.mjs")
const abcURL = getURLFromFilePath(abcPath)
const abcNs = createNamespace({
  a: "a",
  b: "b",
  c: "c",
  default: "default"
})

const defPath = path.resolve("fixture/export/def.js")
const defNs = createNamespace({
  default: { d: "d", e: "e", f: "f" }
})

function checkError(error, code) {
  const { message } = error

  assert.strictEqual(error.code, code)
  assert.strictEqual(error.message, message)
  assert.strictEqual(error.name, "Error")
  assert.deepStrictEqual(Object.keys(error), [])
  assert.deepStrictEqual(Object.getOwnPropertySymbols(error), [])
}

function checkErrorStack(error, startsWith) {
  const stack = error.stack.replace(/\r\n/g, "\n")

  assert.ok(
    stack.startsWith(startsWith) ||
    stack.startsWith("SyntaxError:")
  )
}

function checkLegacyErrorProps(error, code) {
  assert.strictEqual(error.code, code)
  assert.strictEqual(error.name, "Error")
  assert.strictEqual(error.toString(), "Error: " + error.message)
  assert.notDeepStrictEqual(Object.keys(error), [])
  assert.deepStrictEqual(Object.getOwnPropertySymbols(error), [])
}

function getURLFromFilePath(filename) {
  return fileProtocol + filename.replace(/\\/g, "/")
}

describe("miscellaneous tests", () => {
  describe("builtin modules", () => {
    it("should load builtin modules", () =>
      import("./misc/builtin/load-uncached.mjs")
        .then((ns) => ns.default())
    )

    it("should fire setters if already loaded", () =>
      import("./misc/builtin/load-cached.mjs")
        .then((ns) => ns.default())
    )

    it("should produce valid namespace objects", () =>
      import("./misc/builtin/namespace.mjs")
        .then((ns) => ns.default())
    )

    it("should support `console.Console()`", () => {
      const console = new Console(process.stdout)

      assert.ok(console instanceof Console)
      assert.strictEqual(console.constructor, Console)
    })

    it("should support subclassing `console.Console()`", () => {
      class Sub extends Console {
        constructor(...args) {
          super(...args)
          this.sub = "sub"
        }
      }

      const console = new Sub(process.stdout)

      assert.ok(console instanceof Console)
      assert.ok(console instanceof Sub)
      assert.ok(Reflect.has(console, "_stdout"))
      assert.strictEqual(console.sub, "sub")
    })

    it("should not have constructable `console` methods", () => {
      const console = new Console(process.stdout)
      const names = Object.keys(console)

      for (const name of names) {
        const func = console[name]

        if (typeof func === "function" &&
            name !== "Console") {
          assert.throws(
            () => new func,
            TypeError
          )
        }
      }
    })

    it("should support `Module`", () => {
      const mod = new Module

      assert.ok(mod instanceof Module)
      assert.strictEqual(mod.constructor, Module)
    })

    it("should support subclassing `stream.Stream()`", () => {
      const Ctors = [
        stream,
        stream.Duplex,
        stream.Readable,
        stream.Stream,
        stream.Transform,
        stream.Writable
      ]

      for (const Ctor of Ctors) {
        class Sub1 extends Ctor {
          constructor(...args) {
            super(...args)
            this.sub = "sub"
          }
        }

        class Sub2 extends Ctor {}

        const sub1 = new Sub1
        const sub2 = new Sub2

        assert.ok(sub1 instanceof Ctor)
        assert.ok(sub1 instanceof Sub1)
        assert.ok(Reflect.has(sub1, "domain"))
        assert.strictEqual(sub1.sub, "sub")

        assert.ok(sub2 instanceof Ctor)
        assert.ok(sub2 instanceof Sub2)
        assert.strictEqual(sub2 instanceof Sub1, false)

        if (canTestHasInstance) {
          if (canTestDuplexInstance &&
              Ctor === stream.Duplex) {
            assert.ok(sub1 instanceof stream.Writable)
          }

          assert.ok(sub1 instanceof stream)
        }
      }
    })

    it("should support `util.format()`", () => {
      const strings = [
        "%s%",
        "%s%%"
      ]

      for (const string of strings) {
        assert.strictEqual(util.format(string, 99), "99%")
      }
    })

    it("should support `util.formatWithOptions()`", function () {
      if (! canTestUtilFormatWithOptions) {
        this.skip()
      }

      const { formatWithOptions } = util

      let strings = [
        "%s%",
        "%s%%"
      ]

      for (const string of strings) {
        assert.strictEqual(formatWithOptions({}, string, 99), "99%")
      }

      strings = [
        "%O%",
        "%O%%"
      ]

      for (const string of strings) {
        assert.strictEqual(formatWithOptions({ colors: true }, string, 99), "\u001b[33m99\u001b[39m%")
      }
    })

    it("should support `util.types.isModuleNamespaceObject()`", function () {
      if (! canTestUtilTypes) {
        this.skip()
      }

      const { isModuleNamespaceObject } = util.types

      assert.strictEqual(isModuleNamespaceObject(fsNs), true)
      assert.strictEqual(isModuleNamespaceObject(abcNs), false)
      assert.strictEqual(isModuleNamespaceObject(1), false)
      assert.strictEqual(isModuleNamespaceObject(), false)
    })

    it("should support `util.types.isProxy()`", function () {
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
    it("should support intercepting `require()`", () =>
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

    it("should support ESM in `Module#_compile()`", () => {
      const mod = new Module

      mod._compile('export const a = "a"', "filename")
      mod.loaded = true

      assert.deepEqual(mod.exports, { a: "a" })
    })

    it("should support overwriting globals", () => {
      const { defineProperty } = Reflect
      const consoleDescriptor = Reflect.getOwnPropertyDescriptor(global, "console")
      const reflectDescriptor = Reflect.getOwnPropertyDescriptor(global, "Reflect")

      defineProperty(global, "console", {
        configurable: true,
        value: {
          dir() {
            return "mock"
          }
        },
        writable: true
      })

      defineProperty(global, "Reflect", {
        configurable: true,
        value: {
          get() {
            return "mock"
          }
        },
        writable: true
      })

      const actual = [
        console.dir({}),
        Reflect.get({}, "a")
      ]

      defineProperty(global, "console", consoleDescriptor)
      defineProperty(global, "Reflect", reflectDescriptor)

      assert.deepStrictEqual(actual, ["mock", "mock"])
    })
  })

  describe("options", () => {
    it("should load packages written in ESM syntax with no options.", () =>
      import("esm-syntax")
    )

    it("should support .esmrc options", () =>
      [
        "./fixture/options-file/esmrc-object/index.js",
        "./fixture/options-file/esmrc-string/index.js"
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
        "./fixture/options-file/esmrc-json-object/index.js",
        "./fixture/options-file/esmrc-json-string/index.js"
      ]
      .reduce((promise, request) =>
        promise
          .then(() => import(request))
          .then(assert.fail)
          .catch((e) => assert.ok(e instanceof SyntaxError))
      , Promise.resolve())
    )

    it("should support .esmrc.cjs and .esmrc.js options", () =>
      [
        "./fixture/options-file/esmrc-cjs-object/index.js",
        "./fixture/options-file/esmrc-cjs-string/index.js",
        "./fixture/options-file/esmrc-js-object/index.js",
        "./fixture/options-file/esmrc-js-string/index.js"
      ]
      .reduce((promise, request) =>
        promise
          .then(() => import(request))
          .then(assert.fail)
          .catch((e) => assert.ok(e instanceof SyntaxError))
      , Promise.resolve())
    )

    it("should support .esmrc.mjs options", () =>
      import("./fixture/options-file/esmrc-mjs/index.js")
        .then(assert.fail)
        .catch((e) => assert.ok(e instanceof SyntaxError))
    )

    it("should support esm package options", () =>
      [
        "./fixture/options-file/esm-object/index.js",
        "./fixture/options-file/esm-string/index.js"
      ]
      .reduce((promise, request) =>
        promise
          .then(() => import(request))
          .then(assert.fail)
          .catch((e) => assert.ok(e instanceof SyntaxError))
      , Promise.resolve())
    )

    it("should apply .esmrc over package.json options", () =>
      import("./fixture/options-priority/index.js")
    )

    it("should support esm as package dependencies", () =>
      Promise
        .all([
          "dependencies-field",
          "dev-dependencies-field",
          "peer-dependencies-field"
        ]
        .map((request) => import(request)))
    )

    it("should merge `options.cjs` of all `false` against zero-config defaults", () =>
      Promise
        .all([
          "./fixture/options-auto/all-false/index.js",
          "./fixture/options-auto/all-false-explicit-true/index.js"
        ]
        .map((request) => import(request)))
    )

    it("should merge `options.cjs` explicit fields against zero-config defaults", () =>
      Promise
        .all([
          "./fixture/options-auto/explicit-false/index.js",
          "./fixture/options-auto/explicit-true/index.js"
        ]
        .map((request) => import(request)))
    )
  })

  describe("errors", () => {
    it("should error when `require()` receives an empty `request`", () => {
      try {
        require("")
        assert.fail()
      } catch ({ code }) {
        assert.strictEqual(code, "ERR_INVALID_ARG_VALUE")
      }
    })

    it("should error when `require()` methods receive a non-string `request`", () => {
      const funcs = [
        require,
        require.resolve,
        require.resolve.paths
      ]

      for (const func of funcs) {
        const requests = [
          1,
          false,
          null,
          void 0,
          {}
        ]

        for (const request of requests) {
          try {
            func(request)
            assert.fail()
          } catch ({ code }) {
            assert.strictEqual(code, "ERR_INVALID_ARG_TYPE")
          }
        }
      }
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
            .catch((e) => {
              if (isDebug) {
                assert.ok(true)
              } else {
                checkErrorStack(e, [
                  getURLFromFilePath(id5) + ":1",
                  'import { NOT_EXPORTED } from "../export/abc.mjs"',
                  "",
                  "The requested module '" + abcURL +
                  "' does not provide an export named 'NOT_EXPORTED'"
                ].join("\n"))
              }
            }),
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
        .catch((e) => assert.strictEqual(e.stack.includes(indexPath), false))
    )
  })

  describe("Node rules", () => {
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
      Promise
        .all([
          "./fixture/cjs/ext/import-priority.js",
          "./fixture/cjs/ext/require-priority.js"
        ]
        .map((request) =>
          import(request)
            .then((ns) => assert.strictEqual(ns.default, ".js"))
        ))
    )

    it("should find a file before a package", () => {
      const actual = require.resolve("./fixture/paths/file")

      assert.strictEqual(actual, path.resolve("fixture/paths/file.js"))
    })

    it("should find a package in the current directory", () => {
      const requests = [
        "./fixture/paths/file/",
        "./fixture/paths/file/."
      ]

      for (const request of requests) {
        const actual = require.resolve(request)

        assert.strictEqual(actual, path.resolve("fixture/paths/file/index.js"))
      }
    })

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

    it("should resolve non-local dependencies with `require()`", () => {
      const requests = [
        "home-node-libraries",
        "home-node-modules",
        "node-path",
        "prefix-path"
      ]

      for (const request of requests) {
        assert.ok(require(request))
      }
    })

    it("should resolve non-local dependencies with `require()` in ESM", () =>
      import("./fixture/require-paths/index.js")
        .then((ns) => {
          const requests = [
            "home-node-libraries",
            "home-node-modules",
            "node-path",
            "prefix-path"
          ]

          for (const request of requests) {
            assert.ok(ns.default(request))
          }
        })
    )

    it("should resolve non-local dependencies with `require.resolve()`", () => {
      const datas = [
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

      for (const { id, resolved } of datas) {
        assert.strictEqual(require.resolve(id), resolved)
      }
    })

    it("should resolve non-local dependencies with `require.resolve()` in ESM", () =>
      import("./fixture/require-paths/index.js")
        .then((ns) => {
          const datas = [
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

          for (const { id, resolved } of datas) {
            assert.strictEqual(ns.default.resolve(id), resolved)
          }
        })
    )

    it('should not resolve non-local "." requests with `require()`', () => {
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

    it("should support `options` in `require.resolve()`", () => {
      const paths = [path.resolve("fixture/paths")]
      const actual = require.resolve("a", { paths })

      assert.strictEqual(actual, path.resolve("fixture/paths/node_modules/a/index.js"))
    })

    it("should support `options` in `require.resolve()` in ESM", () =>
      import("./fixture/require-paths/index.js")
        .then((ns) => {
          const paths = [path.resolve("fixture/paths")]
          const actual = ns.default.resolve("a", { paths })

          assert.strictEqual(actual, path.resolve("fixture/paths/node_modules/a/index.js"))
        })
    )

    it("should support `require.resolve.paths()`", () => {
      const expected = [
        path.resolve("node_modules"),
        path.resolve("../node_modules")
      ]

      const actual = require.resolve.paths("a").slice(0, 2)

      assert.deepStrictEqual(actual, expected)
    })

    it("should support `require.resolve.paths()` in ESM", () =>
      import("./fixture/require-paths/index.js")
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

    it("should support modified `require.extensions` in CJS", () => {
      require.extensions[".mjs"] = () => ({})

      Reflect.deleteProperty(require.cache, abcPath)

      assert.doesNotThrow(() => require(abcPath))

      require.extensions[".mjs"] = require.extensions[".js"]

      Reflect.deleteProperty(require.cache, abcPath)

      assert.throws(
        () => require(abcPath),
        SyntaxError
      )
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

    it("should support requests with trailing backslashes in Windows", function () {
      if (! isWin) {
        this.skip()
      }

      const request = ".\\node_modules\\ext-priority\\"

      assert.doesNotThrow(() => require(request))

      return import(request)
    })

    it("should support requests containing safe characters in ESM", () =>
      Promise
        .all([
          "./fixture/safe-characters%5B%23%25&;=%5D.mjs",
          "./fixture/safe-characters%5b%23%25&;=%5d.mjs"
        ]
        .map((request) => import(request)))
    )

    it("should support requests containing unsafe characters in ESM", function () {
      if (isWin) {
        this.skip()
      }

      return Promise
        .all([
          "./fixture/unsafe-characters%5B\b\t\n\r:%3F%5D.mjs",
          "./fixture/unsafe-characters%5B%08%09%0A%0D:%3F%5D.mjs",
          "./fixture/unsafe-characters%5b%08%09%0a%0d:%3f%5d.mjs"
        ]
        .map((request) => import(request)))
    })

    it("should support builtin module specifiers with percent encodings", () =>
      import("%66%73")
        .then((ns) => assert.deepStrictEqual(ns, fsNs))
    )

    it("should support bare module specifiers with percent encodings", () =>
      import("%66%73-extra")
        .then((ns) => assert.deepStrictEqual(ns, fsExtraNs))
    )

    it("should support requests with URL query/fragments in ESM", () =>
      Promise
        .all([
          abcPath + "?a",
          abcPath + "#a",
          abcPath + "?a#a",
          abcPath.replace("abc", "%61%62%63") + "?a#a",
          abcURL + "?a",
          abcURL + "#a",
          abcURL + "?a#a",
          abcURL.replace("abc", "%61%62%63") + "?a#a"
        ]
        .map((request) =>
          import(request)
            .then((ns) => assert.deepStrictEqual(ns, abcNs))
        ))
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

    it("should re-evaluate requests with different URL query/fragments", () =>
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

    it("should not re-evaluate errors in ESM", () =>
      [
        "./fixture/re-evaluate-error.mjs",
        "./fixture/re-evaluate-error.mjs?a",
        "./fixture/re-evaluate-error.mjs#a"
      ]
      .reduce((promise, request) =>
        promise
          .then(() => {
            resetState()
            return import(request)
          })
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
      , Promise.resolve())
    )

    it("should not expose ESM in `module.parent`", () =>
      import("./fixture/options-cjs-cache/parent/off/parent.js")
        .then(({ child, parent }) => {
          assert.ok(parent.parent)
          assert.ok(Reflect.has(child, "parent"))
          assert.strictEqual(typeof child.parent, "undefined")
        })
    )

    it("should expose ESM in `module.parent` with `options.cjs.cache`", () => {
      const filename = path.resolve("fixture/options-cjs-cache/parent/on/child.js")

      Reflect.deleteProperty(require.cache, filename)

      return import("./fixture/options-cjs-cache/parent/on/parent.js")
        .then(({ child, parent }) => {
          assert.ok(parent.parent)
          assert.ok(child.parent)
        })
    })

    it("should not expose ESM in `module.parent` with `options.cjs.cache` in `.mjs` files", () => {
      const filename = path.resolve("fixture/options-cjs-cache/parent/on/child.js")

      Reflect.deleteProperty(require.cache, filename)

      return import("./fixture/options-cjs-cache/parent/on/parent.mjs")
        .then(({ child }) => {
          assert.ok(Reflect.has(child, "parent"))
          assert.strictEqual(typeof child.parent, "undefined")
        })
    })

    it("should not expose ESM in `require.cache`", () => {
      const filename = path.resolve("fixture/options-cjs-cache/require/out/index.js")

      Reflect.deleteProperty(require.cache, filename)

      return import(filename)
        .then(() => assert.strictEqual(Reflect.has(require.cache, filename), false))
    })

    it("should expose ESM in `require.cache` with `options.cjs.cache`", () => {
      const filename = path.resolve("fixture/options-cjs-cache/require/in/index.js")

      Reflect.deleteProperty(require.cache, filename)

      return import(filename)
        .then(() => assert.strictEqual(Reflect.has(require.cache, filename), true))
    })

    it("should add `module.exports.__esModule` to ES modules with `options.cjs.esModule`", () =>
      [
        "./fixture/options-cjs-es-module/es-module",
        "./fixture/options-cjs-es-module/interop"
      ]
      .map((request) => {
        const exported = require(request)
        const descriptor = Reflect.getOwnPropertyDescriptor(exported, "__esModule")

        assert.deepStrictEqual(descriptor, {
          configurable: false,
          enumerable: false,
          value: true,
          writable: false
        })
      })
    )

    it("should treat pseudo modules as CJS in `.mjs` files", () =>
      Promise
        .all([
          import("./fixture/export/star-pseudo.mjs")
            .then((ns) => assert.deepStrictEqual(ns, createNamespace({}))),
          import("./fixture/export/default/pseudo.mjs")
            .then((ns) =>
              assert.deepStrictEqual(ns, createNamespace({
                default: {
                  a: "a",
                  default: "default"
                }
              }))
            )
        ])
    )

    it("should not cache `Module._findPath()` misses", () => {
      const dirPath = path.resolve("fixture/find-path")
      const jsonPath = path.resolve(dirPath, "package.json")
      const mainPath = path.resolve(dirPath, "main.js")
      const originalContent = fs.readFileSync(jsonPath, "utf8")

      let actual = []

      fs.writeFileSync(jsonPath, '"main"\n', "utf8")

      actual.push(Module._findPath(dirPath, [dirPath]))

      fs.writeFileSync(jsonPath, '{"main":"main.js"}', "utf8")

      actual.push(Module._findPath(dirPath, [dirPath]))

      fs.writeFileSync(jsonPath, originalContent, "utf8")

      assert.deepStrictEqual(actual, [false, mainPath])

      const createdPath = path.resolve(dirPath, "created")
      const createdFilename = path.resolve(createdPath, "index.js")

      assert.strictEqual(Module._findPath(createdFilename, [createdPath]), false)

      fs.ensureFileSync(createdFilename, "", "utf8")

      actual = Module._findPath(createdFilename, [createdPath])

      return trash(createdPath)
        .then(() => assert.strictEqual(actual, createdFilename))
    })
  })

  describe("spec compliance", () => {
    it("should establish bindings before evaluation", () =>
      import("./misc/bindings.mjs")
        .then((ns) => ns.default())
    )

    it("should hoist declarations before evaluation", () =>
      import("./misc/hoist-declarations.mjs")
        .then((ns) => ns.default())
    )

    it("should establish live binding of values", () =>
      import("./misc/live.mjs")
        .then((ns) => ns.default())
    )

    it("should evaluate modules in the correct order", () =>
      import("./misc/order/index.js")
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

    it("should support namespace objects of circular CJS modules", () =>
      Promise
        .all([
          "./cycle/namespace/immutable/cjs/a.mjs",
          "./cycle/namespace/mutable/cjs/a.js"
        ]
        .map((request) => import(request)))
    )

    it("should not defer finalization of ESM namespace objects", () =>
      Promise
        .all([
          "./cycle/namespace/immutable/no-re-export-cjs/a.mjs",
          "./cycle/namespace/mutable/no-re-export-cjs/a.js"
        ]
        .map((request) => import(request)))
    )

    it("should defer finalization of ESM namespace objects containing re-exports of non-ES modules", () =>
      Promise
        .all([
          "./cycle/namespace/immutable/re-export/a.mjs",
          "./cycle/namespace/mutable/re-export/a.js"
        ]
        .map((request) => import(request)))
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

    it("should support circular dynamic imports", () =>
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
                "Detected cycle while resolving name 'x1' in '" +
                getURLFromFilePath(path.resolve("fixture/cycle/detected/direct/a.mjs")) + "'"
              )
            }),
          import("./fixture/cycle/detected/indirect/a.mjs")
            .then(assert.fail)
            .catch((e) => {
              assert.ok(e instanceof SyntaxError)
              assert.strictEqual(
                e.message,
                "The requested module '" +
                getURLFromFilePath(path.resolve("fixture/cycle/detected/indirect/a.mjs")) +
                "' does not provide an export named 'x1'"
              )
            }),
          import("./fixture/cycle/detected/self/a.mjs")
            .then(assert.fail)
            .catch((e) => {
              assert.ok(e instanceof SyntaxError)
              assert.strictEqual(
                e.message,
                "Detected cycle while resolving name 'x' in '" +
                getURLFromFilePath(path.resolve("fixture/cycle/detected/self/a.mjs")) + "'"
              )
            })
        ])
    )

    it("should support evaled dynamic import in ESM", () => {
      const code = `
        Promise
          .all([
            "./fixture/export/abc.mjs",
            "./fixture/export/def.js"
          ]
          .map((request) => import(request)))
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
      const requests = [
        "./fixture/eval/direct/strict.js",
        "./fixture/eval/indirect/strict.js"
      ]

      for (const request of requests) {
        assert.strictEqual(typeof require(request), "undefined")
      }
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
      const evalers = [
        () => eval("import.meta"),
        () => (0, eval)("import.meta")
      ]

      for (const evaler of evalers) {
        assert.throws(
          evaler,
          SyntaxError,
          "Cannot use 'import.meta' outside a module"
        )
      }
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
          assert.ok(e.message.includes("does not provide an export"))
        })
    )

    it("should not support loading ESM files from `require()`", () =>
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

    it("should not support loading preloaded ESM files from `require()`", () =>
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
                .catch((e) => checkError(e, "ERR_REQUIRE_ESM")),
              import("./fixture/require-esm/strict/mjs.js")
                .then(assert.fail)
                .catch((e) => checkError(e, "ERR_REQUIRE_ESM"))
            ])
        )
    )

    it("should support loading `.js` ESM files from `require()` with `options.cjs`", () =>
      import("./fixture/require-esm/cjs/js.js")
    )

    it("should not support loading `.mjs` files from `require()` with `options.cjs`", () =>
      import("./fixture/require-esm/cjs/mjs.js")
        .then(assert.fail)
        .catch((e) => checkError(e, "ERR_REQUIRE_ESM"))
    )

    it("should not evaluate already loaded modules", () =>
      [
        "./fixture/cjs/load-count/index.js",
        "./fixture/cycle/load-count/a.js",
        "./fixture/cycle/load-count/a.mjs"
      ]
      .reduce((promise, request) =>
        promise
          .then(() => import(request))
          .then(() => assert.strictEqual(global.loadCount, 1))
      , Promise.resolve())
    )

    it("should not evaluate already loaded modules from `require()`", () =>
      import("./fixture/load-count.js")
        .then(() => assert.strictEqual(require("./fixture/load-count.js"), 1))
    )

    it("should not error importing a non-ambiguous ESM export", () =>
      import("./misc/import/non-ambiguous.esm.js")
        .then((ns) => ns.default())
    )

    it("should not error importing a non-ambiguous CJS export", () =>
      import("./misc/import/non-ambiguous.cjs.js")
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
          "./fixture/import/abc-star-conflict.js",
          "./fixture/import/abc-star-conflict.mjs",
          "./fixture/export/abc-star-conflict.js",
          "./fixture/export/def-star-conflict.js",
          "./fixture/export/abc-star-conflict.mjs"
        ]
        .map((request) =>
          import(request)
            .then(assert.fail)
            .catch((e) => {
              assert.ok(e instanceof SyntaxError)
              assert.ok(e.message.includes("contains conflicting star exports"))
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

    it("should error for missing modules before ESM evaluation", () =>
      [
        "./fixture/import/missing/module/cjs.mjs",
        "./fixture/import/missing/module/esm.mjs",
        "./fixture/import/missing/module/no-ext.mjs",
        "./fixture/cycle/missing/module/a.mjs"
      ]
      .reduce((promise, request) =>
        promise
          .then(() => {
            resetState()
            return import(request)
          })
          .then(assert.fail)
          .catch((e) => {
            assert.strictEqual(Reflect.has(global, "loadCount"), false)
            checkLegacyErrorProps(e, "MODULE_NOT_FOUND")
          })
      , Promise.resolve())
    )

    it("should error for named exports of CJS and JSON modules before evaluation", () =>
      [
        "./fixture/import/missing/named-exports/cjs.mjs",
        "./fixture/import/missing/named-exports/json.mjs"
      ]
      .reduce((promise, request) =>
        promise
          .then(() => {
            resetState()
            return import(request)
          })
          .then(assert.fail)
          .catch(({ message }) => {
            assert.strictEqual(Reflect.has(global, "loadCount"), false)
            assert.ok(message.includes("does not provide an export"))
          })
      , Promise.resolve())
    )

    it("should error for non-exported binding in ES modules before evaluation", () =>
      [
        "./fixture/import/missing/export/cjs.mjs",
        "./fixture/import/missing/export/esm.mjs",
        "./fixture/cjs/missing/export/esm.js",
        "./fixture/cycle/missing/export/a.mjs"
      ]
      .reduce((promise, request) =>
        promise
          .then(() => {
            resetState()
            return import(request)
          })
          .then(assert.fail)
          .catch(({ message }) => {
            assert.strictEqual(Reflect.has(global, "loadCount"), false)
            assert.ok(message.includes("does not provide an export"))
          })
      , Promise.resolve())
    )

    it("should error for non-exported binding of uncached CJS modules after evaluation", () =>
      [
        "./fixture/cjs/missing/export/cjs.js",
        "./fixture/cjs/missing/export/bridge.js"
      ]
      .reduce((promise, request) =>
        promise
          .then(() => {
            Reflect.deleteProperty(require.cache, abcPath)
            Reflect.deleteProperty(require.cache, defPath)

            return import(request)
              .then(assert.fail)
              .catch(({ message }) => {
                assert.strictEqual(global.loadCount, 1)
                assert.ok(message.includes("does not provide an export"))
              })
          })
      , Promise.resolve())
    )

    it("should error for non-exported binding of cached CJS modules before evaluation", () =>
      [
        "./fixture/cjs/missing/export/cjs.js",
        "./fixture/cjs/missing/export/bridge.js"
      ]
      .reduce((promise, request) =>
        promise
          .then(() =>
            import(request)
              .then(assert.fail)
              .catch(({ message }) => {
                assert.strictEqual(Reflect.has(global, "loadCount"), false)
                assert.ok(message.includes("does not provide an export"))
              })
          )
      , Promise.resolve())
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

    it("should error when exporting re-declared classes", () => {
      const filename = path.resolve("fixture/source/re-declared-class.mjs")

      return import(filename)
        .then(assert.fail)
        .catch((e) => {
          if (isDebug) {
            assert.ok(true)
          } else {
            checkErrorStack(e, [
              getURLFromFilePath(filename) + ":3",
              "export default class A {}",
              "",
              "SyntaxError: Identifier 'A' has already been declared"
            ].join("\n"))
          }
        })
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

    it("should error when accessing CJS variables", () =>
      Promise
        .all([
          "./fixture/source/cjs-var-dirname.mjs",
          "./fixture/source/cjs-var-exports.mjs",
          "./fixture/source/cjs-var-filename.mjs",
          "./fixture/source/cjs-var-module.mjs",
          "./fixture/source/cjs-var-require.mjs"
        ]
        .map((request) =>
          import(request)
            .then(assert.fail)
            .catch((e) => {
              assert.ok(e instanceof ReferenceError)
              assert.ok(e.message.includes("is not defined"))
            })
        ))
    )

    it("should error when accessing `arguments`", () => {
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

    it("should ignore non-identifier properties for named exports of CJS and JSON modules", () =>
      Promise
        .all([
          "./fixture/cjs/json/export-identifiers-cjs.js",
          "./fixture/cjs/json/export-identifiers-json.js"
        ]
        .map((request) =>
          import(request)
            .then((ns) =>
              assert.deepStrictEqual(ns, createNamespace({
                _҇: "_҇",
                a: "a",
                arguments: "arguments",
                await: "await",
                enum: "enum",
                eval: "eval",
                implements: "implements",
                interface: "interface",
                let: "let",
                package: "package",
                private: "private",
                protected: "protected",
                public: "public",
                static: "static",
                yield: "yield",
                Ƞ: "Ƞ",
                ȡ: "ȡ",
                ಠ_ಠ: "ಠ_ಠ",
                "𐊧": "𐊧"
              }))
            )
        ))
    )
  })

  describe("workers support", () => {
    before(function () {
      if (! canTestWorker) {
        this.skip()
      }
    })

    const Worker = canTestWorker
      ? require("worker_threads").Worker
      : null

    const createOnExit = (reject) => {
      return (code) => {
        if (code !== 0) {
          reject(new Error("Worker stopped with exit code " + code))
        }
      }
    }

    it("should work with inlined workers", () =>
      new Promise((resolve, reject) =>
        new Worker('require("./fixture/worker")', {
          eval: true
        })
        .on("message", resolve)
        .on("error", reject)
        .on("exit", createOnExit(reject))
      )
    )

    it("should work with external workers", () =>
      new Promise((resolve, reject) =>
        new Worker("./fixture/worker/index.js")
          .on("message", resolve)
          .on("error", reject)
          .on("exit", createOnExit(reject))
      )
    )
  })

  describe("transforms", () => {
    const zeroWidthJoinerRegExp = /\u200D/

    it("should wrap binding access in circular modules", () =>
      import("./fixture/transform/cycle.mjs")
        .then((ns) => assert.ok(zeroWidthJoinerRegExp.test(ns.default)))
    )

    it("should not wrap binding access in non-circular modules", () =>
      import("./fixture/transform/non-cycle.mjs")
        .then((ns) => assert.strictEqual(zeroWidthJoinerRegExp.test(ns.default), false))
    )
  })
})
