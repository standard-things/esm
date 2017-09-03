import assert from "assert"
import path from "path"
import requireHook from "../build/esm.js"

describe("require hook", () => {
  it("should create a require function that can load ESM", () =>
    import("./module.js")
      .then((ns) => {
        const mod = ns.default
        const esmRequire = requireHook(mod)

        const abcNs = {
          a: "a",
          b: "b",
          c: "c",
          default: "default"
        }

        const exported = esmRequire("./fixture/export/abc.mjs")
        assert.deepEqual(exported, abcNs)
      })
  )
})
