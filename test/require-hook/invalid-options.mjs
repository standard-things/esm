import assert from "assert"
import makeRequire from "../../index.js"
import module from "../module.js"

export default () => {
  const optionNames = [
    "await",
    "cache",
    "debug",
    "force",
    "mainFields",
    "mode",
    "sourcemap",
    "sourceMap"
  ]

  for (const name of optionNames) {
    const realName = name === "sourcemap"
      ? "sourceMap"
      : name

    assert.throws(
      () => makeRequire(module, { [name]: -1 }),
      new RegExp("Error: The esm@[-\\w.]+ option '" + realName + "' is invalid")
    )
  }

  assert.throws(
    () => makeRequire(module, { mainFields: [-1] }),
    /Error: The esm@[-\w.]+ option 'mainFields' is invalid/
  )

  assert.throws(
    () => makeRequire(module, { cjs: { namedExports: -1 } }),
    /Error: The esm@[-\w.]+ option cjs\['namedExports'\] is invalid/
  )

  assert.throws(
    () => makeRequire(module, { cjs: { namedexports: true } }),
    /Error: Unknown esm@[-\w.]+ option: cjs\['namedexports'\]/
  )

  assert.throws(
    () => makeRequire(module, { esm: "mjs" }),
    /Error: Unknown esm@[-\w.]+ option: esm/
  )
}
