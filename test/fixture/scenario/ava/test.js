import cjsMath, { add as cjsAdd } from "./math.js"
import esmMath, { add as esmAdd, picked as esmPicked } from "./"
import test from "ava"

test("test", (t) => {
  t.is(cjsAdd, esmAdd)
  t.is(cjsMath.add, esmMath.add)
  t.is(cjsMath.add, esmPicked.add)
})
