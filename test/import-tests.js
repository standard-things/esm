import SemVer from "semver"

const isV8 = Reflect.has(process.versions, "v8")

const canTestLiveBinding =
  isV8 &&
  SemVer.satisfies(process.version, ">=6.2.0")

describe("import declaration tests", () => {
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

  it("should support live binding of named exports for CJS modules", function () {
    if (! canTestLiveBinding) {
      this.skip()
    }

    return import("./cjs/import/live.js")
      .then((ns) => ns.default())
  })
})
