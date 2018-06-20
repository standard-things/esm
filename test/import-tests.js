import SemVer from "semver"

import assert from "assert"

const canTestLiveBinding =
  Reflect.has(process.versions, "v8") &&
  SemVer.satisfies(process.version, ">=6.2.0")

describe("import declarations", () => {
  it("should support same symbol as different locals", () =>
    import("./import/locals.mjs")
      .then((ns) => ns.default())
  )

  it("should support mixed import styles of ES modules", () =>
    import("./import/mixed.mjs")
      .then((ns) => ns.default())
  )

  it("should support mixed import styles of CJS modules", () =>
    import("./cjs/import/mixed.mjs")
      .then((ns) => ns.default())
  )

  it("should support CJS modules setting `module.exports`", () =>
    import("./cjs/import/exports.js")
      .then((ns) => ns.default())
  )

  ;(canTestLiveBinding ? it : xit)(
  "should support live binding of named exports for CJS modules", () =>
    import("./cjs/import/live.js")
      .then((ns) => ns.default())
  )
})
