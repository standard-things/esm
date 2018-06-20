import assert from "assert"
import createNamespace from "../../create-namespace.js"
import def1, * as def2 from "../../fixture/export/def.js"
import * as def3 from "../../fixture/export/def.js"
import { default as def4 } from "../../fixture/export/def.js"

export default () => {
  const defNs = createNamespace({
    default: { d: "d", e: "e", f: "f" }
  })

  assert.strictEqual(def1, def2.default)
  assert.strictEqual(def4, def2.default)
  assert.strictEqual(def2, def3)
  assert.deepStrictEqual(def2, defNs)
}
