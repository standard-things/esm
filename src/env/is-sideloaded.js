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

    const filename = realpath(argv[1])
    const args = argv.slice(2)
    const nodeModulesIndex = args.length
      ? normalize(filename).lastIndexOf("/node_modules/")
      : -1

    // From a package like Mocha.
    if (nodeModulesIndex !== -1 &&
        hasLoaderArg(args) &&
        (Package.get(cwd()) !== null ||
        Package.get(filename.slice(0, nodeModulesIndex + 1)) !== null)) {
      return env.sideloaded = true
    }

    // From istanbuljs/nyc.
    return env.sideloaded = isNyc()
  }

  return isSideloaded
}

export default shared.inited
  ? shared.module.envIsSideloaded
  : shared.module.envIsSideloaded = init()
