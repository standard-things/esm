import cjsMath, { cjsAdd } from "./math.js"
import esmMath, { esmAdd } from "./"
import test from "ava"

test("test", (t) => {
  t.is(cjsAdd, esmAdd)
  t.is(cjsMath.add, esmMath.add)
})
