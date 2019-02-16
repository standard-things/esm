import SemVer from "semver"

import assert from "assert"

const canTestLiveBinding = SemVer.satisfies(process.version, ">=6.2")

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

  it("should not swallow getter errors of CJS modules", () =>
    import("./fixture/cjs/import/getter-error.js")
      .then(assert.fail)
      .catch((e) => {
        assert.ok(e instanceof ReferenceError)
        assert.strictEqual(e.message, "unsafe getter")
      })
  )
})
