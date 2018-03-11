import assert from "assert"
import makeRequire from "../../"
import module from "../module.js"

export default () => {
  assert.throws(
    () => makeRequire(module, { mode: "js" }),
    Error,
    `Error [ERR_INVALID_ESM_MODE]: The ESM option 'mode' is invalid. Received "js"`
  )

  assert.throws(
    () => makeRequire(module, { esm: "mjs" }),
    Error,
    "Error [ERR_UNKNOWN_ESM_OPTION]: Unknown ESM option: esm"
  )
}
