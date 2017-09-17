import assert from "assert"
import cjs from "../../fixture/builtin/load.js"
import esm from "../../fixture/builtin/load.mjs"

export default () => {
  const namespaces = [cjs, esm]
  namespaces.forEach((ns) => assert.ok(Object.keys(ns).length))
}
