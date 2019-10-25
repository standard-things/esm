import assert from "assert"
import require from "./require.js"

describe("file extension tests", () => {
  it("should not error importing `.mjs` files", () =>
    import("./fixture/ext/a.mjs")
  )

  it("should not error loading `.cjs` files with `options.cjs.paths`", () =>
    Promise
      .all([
        "./fixture/cjs/ext/import-cjs-ext.js",
        "./fixture/cjs/ext/require-cjs-ext.js"
      ]
      .map((request) => import(request)))
  )

  it("should error importing extensionless files from ESM", () =>
    Promise
      .all([
        "./fixture/ext/no-ext-cjs",
        "./fixture/ext/no-ext-esm"
      ]
      .map((request) =>
        import(request)
          .then(assert.fail)
          .catch(({ code }) => assert.strictEqual(code, "ERR_UNKNOWN_FILE_EXTENSION"))
      ))
  )

  it("should not error loading extensionless files with `options.cjs.paths`", () =>
    Promise
      .all([
        "./fixture/cjs/ext/import-no-ext.js",
        "./fixture/cjs/ext/require-no-ext.js"
      ]
      .map((request) => import(request)))
  )

  it("should not error requiring extensionless files", () => {
    require("./fixture/ext/no-ext-cjs")
  })

  it("should error importing files with unknown extensions from ESM", () =>
    Promise
      .all([
        "./fixture/ext/a.unknown-ext-cjs",
        "./fixture/ext/a.unknown-ext-esm",
        "./fixture/cjs/ext/a.unknown-ext-cjs",
        "./fixture/cjs/ext/a.unknown-ext-esm"
      ]
      .map((request) =>
        import(request)
          .then(assert.fail)
          .catch(({ code }) => assert.strictEqual(code, "ERR_UNKNOWN_FILE_EXTENSION"))
      ))
  )

  it("should not error loading files with unknown extensions with `options.cjs.paths`", () =>
    Promise
      .all([
        "./fixture/cjs/ext/import-unknown-ext.js",
        "./fixture/cjs/ext/require-unknown-ext.js"
      ]
      .map((request) => import(request)))
  )

  it("should not error requiring unknown extensions", () => {
    require("./fixture/ext/a.unknown-ext-cjs")
  })
})
