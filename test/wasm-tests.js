import SemVer from "semver"

const canTestWASM = SemVer.satisfies(process.version, ">=8")

describe("wasm tests", () => {
  before(function () {
    if (! canTestWASM) {
      this.skip()
    }
  })

  it("should support `options.wasm`", () =>
    import("./wasm/import.js")
      .then((ns) => ns.default())
  )
})
