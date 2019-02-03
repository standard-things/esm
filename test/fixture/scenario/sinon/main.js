import assert from "assert"
import { log } from "console"
import sinon from "sinon"
import * as immutable from "../../math/add.mjs"
import * as mutable from "../../math/add.esm.js"

assert.throws(
  () => sinon.stub(immutable, "default"),
  TypeError
)

sinon.stub(mutable, "default").returns(4)

require = require("../../../../")(module)

const reMutable = require("../../math/add.esm.js")

assert.strictEqual(mutable.default(1, 2), 4)
assert.strictEqual(reMutable.default(1, 2), 4)

reMutable.default.returns(8)

assert.strictEqual(mutable.default(1, 2), 8)
assert.strictEqual(reMutable.default(1, 2), 8)

log("sinon:true")
