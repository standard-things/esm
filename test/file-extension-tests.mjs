import assert from "assert"
import require from "./require.js"

describe("file extension", () => {
  it("should not error loading extensionless files with `require`", () => {
    require("./fixture/ext/no-ext-js")
  })

  it("should not error loading unknown extensions with `require`", () => {
    require("./fixture/ext/a.js.unknown")
  })

  it("should error loading extensionless files with dynamic import in CJS", () =>
    import("./ext/no-ext.js")
      .then((ns) => ns.default())
  )

  it("should not error loading extensionless files with dynamic import in CJS with `options.cjs.paths`", () =>
    import("./cjs/ext/no-ext.js")
      .then((ns) => ns.default())
  )

  it("should error loading extensionless files with dynamic import in ESM", () =>
    import("./fixture/ext/no-ext-mjs")
      .then(() => assert.ok(false))
      .catch((e) => assert.strictEqual(e.code, "ERR_UNKNOWN_FILE_EXTENSION"))
  )

  it("should not error extensionless files with dynamic import in ESM with `options.cjs.paths`", () =>
    import("./cjs/ext/no-ext.mjs")
      .then((ns) => ns.default())
  )

  it("should error loading unknown extensions with dynamic import in CJS", () =>
    import("./ext/unknown.js")
      .then((ns) => ns.default())
  )

  it("should not error loading unknown extensions with dynamic import in CJS with `options.cjs.paths`", () =>
    import("./cjs/ext/unknown.js")
      .then((ns) => ns.default())
  )

  it("should error loading unknown extensions with dynamic import in ESM", () =>
    import("./fixture/ext/a.mjs.unknown")
      .then(() => assert.ok(false))
      .catch((e) => assert.strictEqual(e.code, "ERR_UNKNOWN_FILE_EXTENSION"))
  )

  it("should not error loading unknown extensions with dynamic import in ESM with `options.cjs.paths`", () =>
    import("./cjs/ext/unknown.mjs")
      .then((ns) => ns.default())
  )
})
