import assert from "assert"
import makeRequire from "../../"
import module from "../module.js"
import path from "path"

export default () => {
  const { resolve } = makeRequire(module, {
    mainFields: ["module", "main"]
  })

  assert.strictEqual(path.basename(resolve("main-fields")), "main.js")
  assert.strictEqual(path.basename(resolve("main-fields-mjs")), "index.js")
}
