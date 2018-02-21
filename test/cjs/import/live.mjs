import assert, { strictEqual } from "assert"
import * as assert2 from "assert"
import process, { cwd } from "process"
import * as process2 from "process"
import def1, { d } from "../../fixture/export/def.js"
import * as def2 from "../../fixture/export/def.js"
import native1, { add } from "../../fixture/cjs/export/native.js"
import * as native2 from "../../fixture/cjs/export/native.js"

export default () => {
  const expected = [1, 1, 1]

  let oldValue = assert.strictEqual

  assert.strictEqual = 1

  let actual = [
    assert.strictEqual,
    assert2.strictEqual,
    strictEqual
  ]

  assert.strictEqual = oldValue

  assert.deepStrictEqual(actual, expected)
  assert.strictEqual(require("assert"), assert)

  oldValue = process.cwd

  process.cwd = 1

  actual = [
    process.cwd,
    process2.cwd,
    cwd
  ]

  process.cwd = oldValue

  assert.deepStrictEqual(actual, expected)
  assert.strictEqual(process2.cwd(), process.cwd())
  assert.strictEqual(cwd(), process.cwd())
  assert.strictEqual(require("process"), process)

  oldValue = def1.d

  def1.d = 1

  actual = [
    def1.d,
    def2.d,
    d
  ]

  def1.d = oldValue

  assert.deepStrictEqual(actual, expected)
  assert.notStrictEqual(require("../../fixture/export/def.js"), def1)

  oldValue = native1.add

  native1.add = 1

  actual = [
    native1.add,
    native2.add,
    add
  ]

  native1.add = oldValue

  const set = new Set
  add.call(set, "c")

  assert.deepStrictEqual(actual, expected)
  assert.deepStrictEqual([...set], ["c"])
  assert.notStrictEqual(require("../../fixture/cjs/export/native.js"), native1)
}
