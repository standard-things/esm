describe("export declaration tests", () => {
  it("should support star exports", () =>
    import("./export/star.mjs")
      .then((ns) => ns.default())
  )

  it("should support circular star exports", () =>
    import("./export/star-cycle.mjs")
      .then((ns) => ns.default())
  )

  it("should support specifiers that shadow `Object.prototype`", () =>
    import("./export/shadowed.mjs")
      .then((ns) => ns.default())
  )

  it("should support all default syntax", () =>
    import("./export/default.mjs")
      .then((ns) => ns.default())
  )

  it("should support all declaration syntax", () =>
    import("./export/declarations.mjs")
      .then((ns) => ns.default())
  )

  it("should support all named export syntax", () =>
    import("./export/named.mjs")
      .then((ns) => ns.default())
  )

  it("should support one-to-many renamed exports", () =>
    import("./export/renamed.mjs")
      .then((ns) => ns.default())
  )

  it("should support all export-from syntax", () =>
    import("./export/from.mjs")
      .then((ns) => ns.default())
  )

  it("should support destructuring syntax", () =>
    import("./export/destructuring.mjs")
      .then((ns) => ns.default())
  )
})
