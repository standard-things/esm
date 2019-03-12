import assert from "assert"
import { stub } from "sinon"
import * as immutable from "../../math/math.mjs"
import * as mutable from "../../math/math.esm.js"

assert.throws(
  () => stub(immutable, "add"),
  TypeError
)

stub(mutable, "add").returns(4)
require = require("../../../../index.js")(module)

const reMutable = require("../../math/math.esm.js")

assert.strictEqual(mutable.add(1, 2), 4)
assert.strictEqual(reMutable.add(1, 2), 4)

mutable.add.restore()
stub(reMutable, "add").returns(8)

assert.strictEqual(mutable.add(1, 2), 8)
assert.strictEqual(reMutable.add(1, 2), 8)
