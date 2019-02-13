import SemVer from "semver"
import { Stream } from "stream"

import assert from "assert"
import mockIo from "mock-stdio"
import stripANSI  from "strip-ansi"
import accessor1, { a, b } from "../../fixture/cjs/export/accessor.js"
import * as accessor2 from "../../fixture/cjs/export/accessor.js"
import console1, { log } from "console"
import * as console2 from "console"
import Date1, { now } from "../../fixture/cjs/export/date-constructor.js"
import * as Date2 from "../../fixture/cjs/export/date-constructor.js"
import def1, { d } from "../../fixture/export/def.js"
import * as def2 from "../../fixture/export/def.js"
import events1 from "events"
import * as events2 from "events"
import path1, { join } from "path"
import * as path2 from "path"
import process1, { cwd } from "process"
import * as process2 from "process"
import regexp1, { test } from "../../fixture/cjs/export/regexp.js"
import * as regexp2 from "../../fixture/cjs/export/regexp.js"

const accessor3 = require("../../fixture/cjs/export/accessor.js")
const console3 = require("console")
const Date3 = require("../../fixture/cjs/export/date-constructor.js")
const def3 = require("../../fixture/export/def.js")
const events3 = require("events")
const path3 = require("path")
const process3 = require("process")
const regexp3 = require("../../fixture/cjs/export/regexp.js")

const canTestHasInstance = SemVer.satisfies(process.version, ">=6.5")

function funcToString(func) {
  return Function.prototype.toString.call(func)
}

function getTagFromString(object) {
  return Object.prototype.toString.call(object).slice(8, -1)
}

function getTagFromSymbol(object) {
  return object[Symbol.toStringTag]
}

function has(object, name) {
  return Object.prototype.hasOwnProperty.call(object, name)
}

export default () => {
  let objects = [console1, console2, console3]
  let descriptor = Reflect.getOwnPropertyDescriptor(console1, "log")
  let proxyValue = console1.log

  console1.log = 1

  let updated = [console1.log, console2.log, console3.log, log]

  Reflect.deleteProperty(console1, "log")

  let deleted = [
    ! has(console1, "log"),
    ! has(console2, "log"),
    ! has(console3, "log")
  ]

  Reflect.defineProperty(console1, "log", descriptor)

  let reverted = [console1.log, console2.log, console3.log, log]

  mockIo.start()
  console1.log(1)
  console2.log(1)
  console3.log(1)
  log(1)

  assert.strictEqual(stripANSI(mockIo.end().stdout), "1\n1\n1\n1\n")
  assert.strictEqual(funcToString(log), funcToString(console.log))
  assert.deepStrictEqual(updated, [1, 1, 1, 1])
  assert.deepStrictEqual(deleted, [true, false, true])
  assert.deepStrictEqual(reverted, Array(4).fill(proxyValue))
  assert.notStrictEqual(console1, console2)
  assert.strictEqual(console1, console3)
  assert.deepStrictEqual(objects.map(getTagFromString), ["Object", "Module", "Object"])
  assert.deepStrictEqual(objects.map(getTagFromSymbol), [void 0, "Module", void 0])

  objects = [Date1, Date2, Date3]
  descriptor = Reflect.getOwnPropertyDescriptor(Date1, "now")
  proxyValue = Date1.now

  let rawValue = Date3.now

  Date1.now = 1
  updated = [Date1.now, Date2.now, Date3.now, now]
  Reflect.deleteProperty(Date1, "now")

  deleted = [
    ! Reflect.has(Date1, "now"),
    ! Reflect.has(Date2, "now"),
    ! Reflect.has(Date3, "now")
  ]

  Reflect.defineProperty(Date1, "now", descriptor)
  reverted = [Date1.now, Date2.now, Date3.now, now]

  assert.deepStrictEqual(updated, [1, 1, 1, 1])
  assert.deepStrictEqual(deleted, [true, false, true])
  assert.deepStrictEqual(reverted, [proxyValue, proxyValue, rawValue, proxyValue])
  assert.notStrictEqual(Date1, Date2)
  assert.notStrictEqual(Date1, Date3)
  assert.deepStrictEqual(objects.map(getTagFromString), ["Function", "Module", "Function"])
  assert.deepStrictEqual(objects.map(getTagFromSymbol), [void 0, "Module", void 0])

  objects = [def1, def2, def3]
  descriptor = Reflect.getOwnPropertyDescriptor(def1, "d")
  rawValue = def3.d

  def1.d = 1
  updated = [def1.d, def2.d, def3.d, d]
  Reflect.deleteProperty(def1, "d")

  deleted = [
    ! Reflect.has(def1, "d"),
    ! Reflect.has(def2, "d"),
    ! Reflect.has(def3, "d")
  ]

  Reflect.defineProperty(def1, "d", descriptor)
  reverted = [def1.d, def2.d, def3.d, d]

  assert.deepStrictEqual(updated, [1, 1, 1, 1])
  assert.deepStrictEqual(deleted, [true, false, true])
  assert.deepStrictEqual(reverted, Array(4).fill(rawValue))
  assert.notStrictEqual(def1, def2)
  assert.notStrictEqual(def1, def3)
  assert.deepStrictEqual(objects.map(getTagFromString), ["Object", "Module", "Object"])
  assert.deepStrictEqual(objects.map(getTagFromSymbol), [void 0, "Module", void 0])

  objects = [path1, path2, path3]
  descriptor = Reflect.getOwnPropertyDescriptor(path1, "join")
  rawValue = path3.join

  path1.join = 1
  updated = [path1.join, path2.join, path3.join, join]
  Reflect.deleteProperty(path1, "join")

  deleted = [
    ! Reflect.has(path1, "join"),
    ! Reflect.has(path2, "join"),
    ! Reflect.has(path3, "join")
  ]

  Reflect.defineProperty(path1, "join", descriptor)
  reverted = [path1.join, path2.join, path3.join, join]

  assert.deepStrictEqual(updated, [1, 1, 1, 1])
  assert.deepStrictEqual(deleted, [true, false, true])
  assert.deepStrictEqual(reverted, Array(4).fill(rawValue))
  assert.notStrictEqual(path1, path2)
  assert.strictEqual(path1, path3)
  assert.deepStrictEqual(objects.map(getTagFromString), ["Object", "Module", "Object"])
  assert.deepStrictEqual(objects.map(getTagFromSymbol), [void 0, "Module", void 0])

  objects = [process1, process2, process3]
  descriptor = Reflect.getOwnPropertyDescriptor(process1, "cwd")
  proxyValue = process1.cwd

  process1.cwd = 1
  updated = [process1.cwd, process2.cwd, process3.cwd, cwd]
  Reflect.deleteProperty(process1, "cwd")

  deleted = [
    ! Reflect.has(process1, "cwd"),
    ! Reflect.has(process2, "cwd"),
    ! Reflect.has(process3, "cwd")
  ]

  Reflect.defineProperty(process1, "cwd", descriptor)
  reverted = [process1.cwd, process2.cwd, process3.cwd, cwd]

  assert.strictEqual(cwd(), process1.cwd())
  assert.strictEqual(process2.cwd(), process1.cwd())
  assert.strictEqual(process3.cwd(), process1.cwd())
  assert.strictEqual(funcToString(cwd), funcToString(process.cwd))
  assert.deepStrictEqual(updated, [1, 1, 1, 1])
  assert.deepStrictEqual(deleted, [true, false, true])
  assert.deepStrictEqual(reverted, Array(4).fill(proxyValue))
  assert.notStrictEqual(process1, process2)
  assert.strictEqual(process1, process3)
  assert.deepStrictEqual(objects.map(getTagFromString), ["process", "Module", "process"])
  assert.deepStrictEqual(objects.map(getTagFromSymbol), ["process", "Module", "process"])

  objects = [regexp1, regexp2, regexp3]
  descriptor = Reflect.getOwnPropertyDescriptor(regexp1, "test")
  proxyValue = regexp1.test
  rawValue = regexp3.test

  regexp1.test = 1
  regexp1[Symbol.toStringTag] = 1
  updated = [regexp1.test, regexp2.test, regexp3.test, test]
  Reflect.deleteProperty(regexp1, "test")

  deleted = [
    ! Reflect.has(regexp1, "test"),
    ! Reflect.has(regexp2, "test"),
    ! Reflect.has(regexp3, "test")
  ]

  regexp1.test = proxyValue
  assert.strictEqual(regexp3.test, rawValue)

  Reflect.defineProperty(regexp1, "test", descriptor)
  reverted = [regexp1.test, regexp2.test, regexp3.test, test]

  assert.strictEqual(test.name, "test")
  assert.strictEqual(test.length, 1)
  assert.strictEqual(String(test), String(RegExp.prototype.test))
  assert.ok(test.call(/b/, "b"))
  assert.deepStrictEqual(updated, [1, 1, 1, 1])
  assert.deepStrictEqual(deleted, [false, false, false])
  assert.deepStrictEqual(reverted, [proxyValue, proxyValue, rawValue, proxyValue])
  assert.notStrictEqual(regexp1, regexp2)
  assert.notStrictEqual(regexp1, regexp3)
  assert.deepStrictEqual(objects.map(getTagFromString), ["RegExp", "Module", "RegExp"])
  assert.deepStrictEqual(objects.map(getTagFromSymbol), ["RegExp", "Module", 1])

  objects = [events1, events2, events3]

  assert.deepStrictEqual(objects.map(getTagFromString), ["Function", "Module", "Function"])
  assert.deepStrictEqual(objects.map(getTagFromSymbol), [void 0, "Module", void 0])

  class SubEvents1 extends events1 {}
  class SubEvents3 extends events3 {}

  const builtinCtors = [events1, events3]
  const stream = new Stream
  const subEvents1 = new SubEvents1
  const subEvents3 = new SubEvents3

  for (const Ctor of builtinCtors) {
    assert.strictEqual(Ctor.prototype.constructor, Ctor)
    assert.strictEqual(new Ctor().constructor, Ctor)
    assert.strictEqual(null instanceof Ctor, false)
    assert.strictEqual(void 0 instanceof Ctor, false)
    assert.strictEqual("" instanceof Ctor, false)

    if (canTestHasInstance) {
      assert.ok(stream instanceof Ctor)
      assert.ok(subEvents1 instanceof Ctor)
      assert.ok(subEvents3 instanceof Ctor)
      assert.strictEqual(subEvents1 instanceof SubEvents3, false)
      assert.strictEqual(subEvents3 instanceof SubEvents1, false)
    }
  }

  objects = [accessor1, accessor2, accessor3]

  assert.deepStrictEqual([a, b], [void 0, void 0])

  for (const { a, b } of objects) {
    assert.deepStrictEqual([a, b], [void 0, void 0])
  }

  accessor1.a = "b"

  assert.strictEqual(Reflect.has(Object.prototype, "a"), false)
  assert.deepStrictEqual([a, b], [void 0, "b"])

  for (const { a, b } of objects) {
    assert.deepStrictEqual([a, b], [void 0, "b"])
  }

  let count = 0

  const countDescriptor = {
    configurable: true,
    enumerable: true,
    get() {
      return count
    }
  }

  Reflect.defineProperty(accessor1, "a", countDescriptor)

  ++count

  assert.deepStrictEqual([a, accessor1.a, a], [0, 1, 1])

  count = 0
  rawValue = def1.d

  Reflect.defineProperty(def1, "d", countDescriptor)

  ++count

  try {
    assert.deepStrictEqual([d, def1.d, d], [0, 1, 1])
  } finally {
    Reflect.deleteProperty(def1, "d")
    def1.d = rawValue
  }
}
