import { argv, cwd } from "../safe/process.js"

import Loader from "../loader.js"
import Package from "../package.js"

import hasLoaderArg from "./has-loader-arg.js"
import isNyc from "./is-nyc.js"
import normalize from "../path/normalize.js"
import realpath from "../fs/realpath.js"
import shared from "../shared.js"

function init() {
  function isSideloaded() {
    if (isNyc()) {
      return true
    }

    const args = argv.slice(2)

    let filename
    let nodeModulesIndex = -1

    if (args.length) {
      filename = realpath(argv[1])
      nodeModulesIndex = normalize(filename).lastIndexOf("/node_modules/")
    }

    const entryState = shared.entry
    const entryCache = entryState.cache

    const pkgState = Loader.state.package
    const pkgCache = pkgState.cache

    entryState.cache = new WeakMap
    pkgState.cache = new Map

    let result = false

    // From a package like Mocha.
    if (nodeModulesIndex !== -1 &&
        hasLoaderArg(args) &&
        (Package.get(cwd()) !== null ||
         Package.get(filename.slice(0, nodeModulesIndex + 1)) !== null)) {
      result = true
    }

    entryState.cache = entryCache
    pkgState.cache = pkgCache

    return result
  }

  return isSideloaded
}

export default shared.inited
  ? shared.module.envIsSideloaded
  : shared.module.envIsSideloaded = init()
