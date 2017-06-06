import assert from "assert"
import { run, value } from "../fixture/eval.js"

export function check() {
  assert.strictEqual(value, "original")
  const result = run('localValue = "modified"')
  assert.strictEqual(value, result)
  assert.strictEqual(value, "modified")
}
