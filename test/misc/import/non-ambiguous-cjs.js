import assert from "assert"
import def, { d, e, f } from "../../fixture/export/def-star.js"
import { e as E } from "../../fixture/export/def-ambiguous.js"

export default () => {
  assert.deepStrictEqual([d, e, E, f, def], ["D", "e", "e", "F", "DEFAULT"])
}
