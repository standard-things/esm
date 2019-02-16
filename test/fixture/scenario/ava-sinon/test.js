import test from "ava"
import { stub } from "sinon"
import * as ns from "../../math/math.esm.js"
import { nsAdd } from "./ns-math.js"

test("test", (t) => {
  stub(ns, "add").returns(4)

  t.is(ns.add(1, 2), 4)
  t.is(nsAdd(1, 2), 4)
})
