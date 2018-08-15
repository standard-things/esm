// Based on `Module.wrap()`.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js

import wrapper from "./wrapper.js"

function wrap(script) {
  return wrapper[0] + script + wrapper[1]
}

export default wrap
