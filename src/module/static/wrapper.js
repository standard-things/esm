// Based on `Module.wrapper`.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js

const wrapper = [
  "(function (exports, require, module, __filename, __dirname) { ",
  "\n});"
]

export default wrapper
