import assert from "assert"
import mockIo from "mock-stdio"
import console1, { log } from "console"
import * as console2 from "console"
import def1, { d } from "../../fixture/export/def.js"
import * as def2 from "../../fixture/export/def.js"
import native1, { add } from "../../fixture/cjs/export/native.js"
import * as native2 from "../../fixture/cjs/export/native.js"
import path1, { join } from "path"
import * as path2 from "path"
import process1, { cwd } from "process"
import * as process2 from "process"

const console3 = require("console")
const def3 = require("../../fixture/export/def.js")
const native3 = require("../../fixture/cjs/export/native.js")
const path3 = require("path")
const process3 = require("process")

export default () => {
  const expected = [1, 1, 1, 1]

  let oldValue = console1.log

  console1.log = 1
  let updated = [console1.log, console2.log, console3.log, log]

  console1.log = oldValue
  let reverted = [console1.log, console2.log, console3.log]

  mockIo.start()
  console1.log(1)
  console2.log(1)
  console3.log(1)
  log(1)

  assert.strictEqual(mockIo.end().stdout, "1\n1\n1\n1\n")

  assert.deepStrictEqual(updated, expected)
  assert.deepStrictEqual(reverted, Array(3).fill(log))
  assert.strictEqual(console1, console3)

  oldValue = path1.join

  path1.join = 1
  updated = [path1.join, path2.join, path3.join, join]

  path1.join = oldValue
  reverted = [path1.join, path2.join, path3.join]

  assert.deepStrictEqual(updated, expected)
  assert.deepStrictEqual(reverted, Array(3).fill(join))
  assert.strictEqual(path1, path3)

  oldValue = process1.cwd

  process1.cwd = 1
  updated = [process1.cwd, process2.cwd, process3.cwd, cwd]

  process1.cwd = oldValue
  reverted = [process1.cwd, process2.cwd, process3.cwd]

  assert.strictEqual(cwd(), process1.cwd())
  assert.strictEqual(process2.cwd(), process1.cwd())
  assert.strictEqual(process3.cwd(), process1.cwd())

  assert.deepStrictEqual(updated, expected)
  assert.deepStrictEqual(reverted, Array(3).fill(cwd))
  assert.strictEqual(process1, process3)

  oldValue = def1.d

  def1.d = 1
  updated = [def1.d, def2.d, def3.d, d]

  def1.d = oldValue
  reverted = [def1.d, def2.d, def3.d]

  assert.deepStrictEqual(updated, expected)
  assert.deepStrictEqual(reverted, Array(3).fill(d))
  assert.notStrictEqual(def1, def3)

  oldValue = native1.add

  native1.add = 1
  updated = [native1.add, native2.add, native3.add, add]

  native1.add = oldValue

  const set = new Set
  add.call(set, "c")

  assert.strictEqual(add.name, "add")
  assert.strictEqual(add.length, 1)
  assert.strictEqual(String(add), String(set.add))
  assert.deepStrictEqual([...set], ["c"])

  assert.deepStrictEqual(updated, expected)
  assert.deepStrictEqual([native2.add, native3.add], [add, add])

  assert.notStrictEqual(native1.add, add)
  assert.notStrictEqual(native1, native3)
}
