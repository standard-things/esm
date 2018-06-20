import assert from "assert"
import makeRequire from "../../../"
import module from "../../module.js"

export default () => {
  const esmRequire = makeRequire(module, {
    mainFields: ["module", "main"]
  })

  assert.ok(esmRequire.resolve("main-fields").endsWith("main.js"))
  assert.ok(esmRequire("main-fields").default.endsWith("main.js"))

  assert.ok(esmRequire.resolve("main-fields-mjs").endsWith("index.js"))
  assert.ok(esmRequire("main-fields-mjs").default.endsWith("index.js"))

  return Promise
    .all([
      import("main-fields")
        .then((ns) => assert.ok(ns.default.endsWith("index.js"))),
      import("main-fields-mjs")
        .then((ns) => assert.ok(ns.default.endsWith("index.js")))
    ])
}
