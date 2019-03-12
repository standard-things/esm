describe("setter tests", () => {
  it("should run setters after eval(...)", () =>
    import("./setter/eval.mjs")
      .then((ns) => ns.default())
  )

  it("should run setters for untouched CJS modules", () =>
    import("./setter/untouched/index.js")
      .then((ns) => ns.default())
  )

  it("should run setters when children update exports", () =>
    import("./setter/children.mjs")
      .then((ns) => ns.default())
  )

  it("should not prematurely seal star exports", () =>
    import("./setter/seal/index.js")
      .then((ns) => ns.default())
  )
})
