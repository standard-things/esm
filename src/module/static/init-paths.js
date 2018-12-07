// Based on `Module._initPaths()`.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js

import GenericArray from "../../generic/array.js"
import Loader from "../../loader.js"
import Module from "../../module.js"
import RealModule from "../../real/module.js"

import initGlobalPaths from "../internal/init-global-paths.js"
import maskFunction from "../../util/mask-function.js"

const initPaths = maskFunction(function () {
  const globalPaths = initGlobalPaths()

  Loader.state.module.globalPaths = globalPaths
  Module.globalPaths = GenericArray.from(globalPaths)
}, RealModule._initPaths)

export default initPaths
