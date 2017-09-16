import assert from "assert"
import meta1 from "./meta/a.mjs"
import meta2 from "./meta/a.js"

export default function () {
  const metas = [meta1, meta2]

  metas.forEach((meta) => {
    assert.deepEqual(meta, {})
    assert.strictEqual(Object.getPrototypeOf(meta), null)
  })

  assert.notStrictEqual(meta1, meta2)
}
