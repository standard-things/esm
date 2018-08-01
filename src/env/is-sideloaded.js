import { argv, cwd } from "../safe/process.js"

import Package from "../package.js"

import hasLoaderArg from "./has-loader-arg.js"
import isNyc from "./is-nyc.js"
import normalize from "../path/normalize.js"
import realpath from "../fs/realpath.js"
import shared from "../shared.js"

function init() {
  function isSideloaded() {
    const { env } = shared

    if (Reflect.has(env, "sideloaded")) {
      return env.sideloaded
    }

    if (isNyc()) {
      return env.sideloaded = true
    }

    const args = argv.slice(2)

    let filename
    let nodeModulesIndex = -1

    if (args.length) {
      filename = realpath(argv[1])
      nodeModulesIndex = normalize(filename).lastIndexOf("/node_modules/")
    }

    // From a package like Mocha.
    if (nodeModulesIndex !== -1 &&
        hasLoaderArg(args) &&
        (Package.get(cwd()) !== null ||
         Package.get(filename.slice(0, nodeModulesIndex + 1)) !== null)) {
      return env.sideloaded = true
    }

    return env.sideloaded = false
  }

  return isSideloaded
}

export default shared.inited
  ? shared.module.envIsSideloaded
  : shared.module.envIsSideloaded = init()
