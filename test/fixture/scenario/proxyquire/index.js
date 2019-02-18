import assert from "assert"
import proxyquire from "proxyquire"

const a = proxyquire
  .load("./a.js", {
    path: {
      extname: () => "c"
    },
    "./b.js": "b"
  })

assert.strictEqual(a.default(), "abc")
