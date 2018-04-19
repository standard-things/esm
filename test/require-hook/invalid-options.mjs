import assert from "assert"
import makeRequire from "../../"
import module from "../module.js"

export default () => {
  assert.throws(
    () => makeRequire(module, { mode: "js" }),
    /Error: The esm@[\d.]+ option 'mode' is invalid\. Received 'js'/
  )

  assert.throws(
    () => makeRequire(module, { esm: "mjs" }),
    /Error: Unknown esm@[\d.]+ option: esm/
  )

  assert.throws(
    () => makeRequire(module, { cjs: { namedexports: true } }),
    /Error: Unknown esm@[\d.]+ option: cjs\["namedexports"\]/
  )
}
