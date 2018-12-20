import assert from "assert"
import { direct, indirect, value } from "../fixture/eval.mjs"

export default () => {
  assert.strictEqual(value, "original")

  const expected = "direct"

  let result = direct('localValue = "direct"')

  assert.strictEqual(value, expected)
  assert.strictEqual(result, expected)

  result = indirect('localValue = "indirect"')

  assert.strictEqual(value, expected)
  assert.strictEqual(result, "indirect")
}
