import test from "ava"
import add from "./add"

test("test", (t) => {
  t.is(add(1, 2), 3)
})
