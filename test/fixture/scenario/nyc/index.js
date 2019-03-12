const assert = require("assert")
const add1 = require("../../math/math.cjs.js").add

require = require("../../../../index.js")(module)

const add2 = require("../../math/math.mjs").add

assert.strictEqual(add1(1, 2), 3)
assert.strictEqual(add2(1, 2), 3)
