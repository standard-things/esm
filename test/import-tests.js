import assert from "assert"

describe("import declarations", () => {
  it("should work in nested scopes", () =>
    import("./import/name.js")
      .then((ns) => ns.check())
  )

  it("should cope with dependency cycles", () =>
    Promise.all([
      import("./import/cycle-a.js"),
      import("./import/cycle-a.js")
    ])
    .then((nss) => nss.forEach((ns) => ns.check()))
  )

  it("should support combinations of import styles", () =>
    import("./import/combinations.js")
      .then((ns) => ns.check())
  )

  it("should import module.exports as default, by default", () =>
    import("./import/default.js")
      .then((ns) => ns.check())
  )

  it("should support same symbol as different locals", () =>
    import("./import/locals.js")
      .then((ns) => ns.check())
  )

  it("should support CommonJS modules setting module.exports", () =>
    import("./import/cjs.js")
      .then((ns) => ns.check())
  )

  it("should support import extensions", () =>
    import("./import/extensions.js")
      .then((ns) => ns.check())
  )
})
