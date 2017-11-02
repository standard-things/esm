import assert from "assert"
import vm from "vm"

let canUseAsyncGenerators = false
let canUseDestructuring = false
let canUseForAwaitOf = false
let canUseObjectRestSpread = false

try {
  canUseAsyncGenerators = !! new vm.Script("async function*x(){}")
} catch (e) {}

try {
  canUseDestructuring = !! new vm.Script("[]=[]")
} catch (e) {}

try {
  canUseForAwaitOf = !! new vm.Script("async(x)=>{for await(x of[]);}")
} catch (e) {}

try {
  canUseObjectRestSpread = !! new vm.Script("let{...x}={...x}")
} catch (e) {}

describe("export declarations", () => {
  it("should support star exports", () =>
    import("./export/star.mjs")
      .then((ns) => ns.default())
  )

  it("should tolerate mutual star exports", () =>
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

  ;(canUseAsyncGenerators ? it : xit)(
  "should support async generators syntax", () =>
    import("./export/async-generators.mjs")
      .then((ns) => ns.default())
  )

  ;(canUseDestructuring ? it : xit)(
  "should support destructuring syntax", () =>
    import("./export/destructuring.mjs")
      .then((ns) => ns.default())
  )

  ;(canUseForAwaitOf ? it : xit)(
  "should support for-await-of syntax", () =>
    import("./export/for-await-of.mjs")
      .then((ns) => ns.default())
  )

  ;(canUseObjectRestSpread ? it : xit)(
  "should support object rest/spread syntax", () =>
    import("./export/object-rest-spread.mjs")
      .then((ns) => ns.default())
  )
})
