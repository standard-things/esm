import assert from "assert"
import { a, b, c } from "../../fixture/export/star-abc.mjs"
import { d, e, f } from "../../fixture/export/ambiguous.mjs"

export default () => {
  assert.deepEqual([a, b, c], ["aa", "b", "cc"])
  assert.deepEqual([d, e, f], ["d", "e", "f"])
}
