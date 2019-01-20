const assert = require("assert")
const add1 = require("../../math/add.cjs.js")

require = require("../../../../")(module)

const add2 = require("../../math/add.mjs").default

assert.strictEqual(add1(1, 2), 3)
assert.strictEqual(add2(2, 3), 5)
