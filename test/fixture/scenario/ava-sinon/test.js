import test from "ava"
import { recapitalize } from "./restring.js"
import { stub } from "sinon"
import * as ns from "./string.js"

test("test", (t) => {
  stub(ns, "capitalize").callsFake((string) => string.toUpperCase())

  t.is(ns.capitalize("abc"), "ABC")
  t.is(recapitalize("def"), "DEF")
})
