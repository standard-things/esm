import assert from "assert"
import makeRequire from "../../"
import module from "../module.js"

export default () => {
  const optionNames = [
    "await",
    "cache",
    "debug",
    "mainFields",
    "mode",
    "sourcemap",
    "sourceMap",
    "warnings"
  ]

  optionNames.forEach((name) => {
    const realName = name === "sourcemap"
      ? "sourceMap"
      : name

    assert.throws(
      () => makeRequire(module, { [name]: -1 }),
      new RegExp("Error: The esm@[\\d.]+ option '" + realName + "' is invalid\\. Received -1")
    )
  })

  assert.throws(
    () => makeRequire(module, { cjs: { namedexports: true } }),
    /Error: Unknown esm@[\d.]+ option: cjs\["namedexports"\]/
  )

  assert.throws(
    () => makeRequire(module, { esm: "mjs" }),
    /Error: Unknown esm@[\d.]+ option: esm/
  )
}
