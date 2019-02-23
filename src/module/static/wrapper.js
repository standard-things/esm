// Based on `Module.wrapper`.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js

import GenericArray from "../../generic/array.js"

const wrapper = GenericArray.of(
  "(function (exports, require, module, __filename, __dirname) { ",
  "\n});"
)

export default wrapper
