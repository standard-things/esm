import assert from "assert"
import * as nsGz from "../fixture/gz/a.gz"
import * as nsJsGz from "../fixture/gz/a.js.gz"
import * as nsMjsGz from "../fixture/gz/a.mjs.gz"

export default () => {
  [nsGz, nsJsGz, nsMjsGz]
    .forEach(assert.ok)
}
