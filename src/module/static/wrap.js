// Based on `Module.wrap()`.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js

import RealModule from "../../real/module.js"

import maskFunction from "../../util/mask-function.js"
import wrapper from "./wrapper.js"

const wrap = maskFunction(function (script) {
  return wrapper[0] + script + wrapper[1]
}, RealModule.wrap)

export default wrap
