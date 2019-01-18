import test from "ava"
import flatten from "./flatten.js"

test("test", (t) => {
  t.deepEqual(flatten([[1], 2]), [1, 2])
})
