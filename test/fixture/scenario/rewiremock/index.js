import assert from "assert"
import rewiremock from "rewiremock"

const a = rewiremock
  .proxy("./a.js", {
    path: {
      extname: () => "c"
    },
    "./b.js": "b"
  })

assert.strictEqual(a.default(), "abc")

const c = rewiremock.proxy("./c.js", {
  path: {
    extname: () => "b"
  },
  "./b.js": "c"
})

assert.strictEqual(c.default(), "acb")

