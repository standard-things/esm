import add from "./"
import test from "ava"

test("should add numbers", (t) => {
  t.is(add(1, 2), 3)
})
