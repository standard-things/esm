import assert from "assert"
import { run, value } from "../fixture/eval.mjs"

export default function () {
  assert.strictEqual(value, "original")
  const result = run('localValue = "modified"')
  assert.strictEqual(value, result)
  assert.strictEqual(value, "modified")
}
