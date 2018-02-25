import cjsAdd from "./add.js"
import esmAdd from "./"
import test from "ava"

test("test", (t) => {
  t.is(cjsAdd, esmAdd)
})
