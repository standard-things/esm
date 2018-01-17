import add from "./index"
import test from "ava"

test('maxRequest - some may fail', (t) => {
  t.is(add(1, 2), 3)
})
