import { argv, cwd } from "../safe/process.js"

import Loader from "../loader.js"
import Package from "../package.js"

import hasLoaderArg from "./has-loader-arg.js"
import isJasmine from "./is-jasmine.js"
import isNyc from "./is-nyc.js"
import realpath from "../fs/realpath.js"
import { sep } from "../safe/path.js"
import shared from "../shared.js"

function init() {
  function isSideloaded() {
    if (isJasmine() ||
        isNyc()) {
      return true
    }

    const args = argv.slice(2)

    if (args.length === 0) {
      return false
    }

    const filename = realpath(argv[1])
    const nodeModulesIndex = filename.lastIndexOf(sep + "node_modules" + sep)

    if (nodeModulesIndex === -1 ||
        ! hasLoaderArg(args)) {
      return false
    }

    const entryState = shared.entry
    const entryCache = entryState.cache

    const pkgState = Loader.state.package
    const pkgCache = pkgState.cache

    entryState.cache = new WeakMap
    pkgState.cache = new Map

    let result = false

    if (Package.get(cwd()) !== null ||
        Package.get(filename.slice(0, nodeModulesIndex + 1)) !== null) {
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
