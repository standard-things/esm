import assert from "assert"
import cjs from "../../fixture/builtin/load.js"
import esm from "../../fixture/builtin/load.mjs"

export default () => {
  const imports = [
    cjs,
    esm
  ]

  for (const def of imports) {
    assert.ok(Object.keys(def).length)
  }
}
