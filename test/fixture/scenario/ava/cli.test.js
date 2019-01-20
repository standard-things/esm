import test from "ava"

import cjsMath, {
  add as cjsAdd,
  addBound as cjsAddBound
} from "./math.cjs.js"

import esmMath, {
  add as esmAdd,
  addBound as esmAddBound,
  picked as esmPicked
} from "./math.esm.js"

test("test", (t) => {
  t.is(cjsAdd, esmAdd)
  t.is(cjsAddBound, esmAddBound)
  t.deepEqual(esmMath, cjsMath)
  t.deepEqual(esmPicked, cjsMath)
})
