import assert from "assert"
import makeRequire from "../../../index.js"
import module from "../../module.js"

export default () => {
  const esmRequire = makeRequire(module, {
    mainFields: ["module", "main"]
  })

  assert.strictEqual(esmRequire("main-fields").default, "module")
  assert.ok(esmRequire.resolve("main-fields").endsWith("module.js"))

  assert.strictEqual(esmRequire("main-fields-mjs").default, "main")
  assert.ok(esmRequire.resolve("main-fields-mjs").endsWith("main.mjs"))

  return Promise
    .all([
      import("main-fields")
        .then((ns) => assert.strictEqual(ns.default, "module")),
      import("main-fields-mjs")
        .then((ns) => assert.strictEqual(ns.default, "main"))
    ])
}
