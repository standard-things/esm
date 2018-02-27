import test from "ava"

import cjsMath, {
  add as cjsAdd,
  addBound as cjsAddBound
} from "./math.js"

import esmMath, {
  add as esmAdd,
  addBound as esmAddBound,
  picked as esmPicked
} from "./"

test("test", (t) => {
  t.is(cjsAdd, esmAdd)
  t.is(cjsAddBound, esmAddBound)
  t.deepEqual(cjsMath, esmMath)
  t.deepEqual(cjsMath, esmPicked)
})
