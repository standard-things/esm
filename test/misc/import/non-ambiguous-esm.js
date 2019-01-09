import assert from "assert"
import abc1, { a as a1, b as b1, c as c1 } from "../../fixture/export/abc-star.js"
import abc2, { a as a2, b as b2, c as c2 } from "../../fixture/export/abc-star.mjs"
import { b as B1 } from "../../fixture/export/abc-ambiguous.js"
import { b as B2 } from "../../fixture/export/abc-ambiguous.mjs"

export default () => {
  const expected = ["A", "b", "C", "DEFAULT"]

  assert.deepStrictEqual([a1, b1, c1, abc1], expected)
  assert.deepStrictEqual([a2, b2, c2, abc2], expected)
  assert.deepStrictEqual([B1, B2], ["b", "b"])
}
