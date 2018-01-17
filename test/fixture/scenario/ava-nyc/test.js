import add from "./add.js"
import test from "ava"

test("test", (t) => {
  t.is(add(1, 2), 3)
})
