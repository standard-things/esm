// Based on Node's `NativeModule.wrap`.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/bootstrap/loaders.js

import wrapper from "./wrapper.js"

function wrap(script) {
  return wrapper[0] + script + wrapper[1]
}

export default wrap
