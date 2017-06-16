import assert from "assert"
import vm from "vm"

let canUseDestructuring = false

try {
  // Test if Node supports destructuring declarations.
  canUseDestructuring = !! new vm.Script("[]=[]")
} catch (e) {}

describe("export declarations", () => {
  it("should support * exports", () =>
    import("./export/ns.js")
      .then((ns) => ns.check())
      .catch(() => assert.ok(false))
  )

  it("should support re-exporting import * alongside export *", () =>
    import("./export/re-export.js")
      .then((ns) => ns.check())
      .catch(() => assert.ok(false))
  )

  it("should tolerate mutual * exports", () =>
    import("./export/all-mutual.js")
      .then((ns) => ns.check())
      .catch(() => assert.ok(false))
  )

  it("should support specifiers that shadow Object.prototype", () =>
    import("./export/shadowed.js")
      .then((ns) => ns.check())
      .catch(() => assert.ok(false))
  )

  it("should support named re-exports", () =>
    import("./export/re-export-named.js")
      .then((ns) => ns.check())
      .catch(() => assert.ok(false))
  )

  it("should support all default syntax", () =>
    import("./export/default.js")
      .then((ns) => ns.check())
      .catch(() => assert.ok(false))
  )

  it("should support all declaration syntax", () =>
    import("./export/declarations.js")
      .then((ns) => ns.check())
      .catch(() => assert.ok(false))
  )

  it("should support all named export syntax", () =>
    import("./export/named.js")
      .then((ns) => ns.check())
      .catch(() => assert.ok(false))
  )

  it("should tolerate one-to-many renamed exports", () =>
    import("./export/renamed.js")
      .then((ns) => ns.check())
      .catch(() => assert.ok(false))
  )

  it("should support all export-from syntax", () =>
    import("./export/from.js")
      .then((ns) => ns.check())
      .catch(() => assert.ok(false))
  )

  ;(canUseDestructuring ? it : xit)(
  "should support all destructuring syntax", () =>
    import("./export/destructuring.js")
      .then((ns) => ns.check())
      .catch(() => assert.ok(false))
  )

  it("should support export extensions", () =>
    import("./export/extensions.js")
      .then((ns) => ns.check())
      .catch(() => assert.ok(false))
  )
})
