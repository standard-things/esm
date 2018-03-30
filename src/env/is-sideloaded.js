import GenericArray from "../generic/array.js"
import Package from "../package.js"

import hasLoaderArg from "./has-loader-arg.js"
import isNyc from "./is-nyc.js"
import normalize from "../path/normalize.js"
import realpath from "../fs/realpath.js"
import realProcess from "../real/process.js"
import shared from "../shared.js"

function isSideloaded() {
  const { env } = shared

  if (Reflect.has(env, "sideloaded")) {
    return env.sideloaded
  }

  const { argv } = realProcess
  const [, filename] = argv
  const args = GenericArray.slice(argv, 2)
  const nodeModulesIndex = args.length
    ? normalize(filename).lastIndexOf("/node_modules/")
    : -1

  // From a package like Mocha.
  if (nodeModulesIndex !== -1 &&
      hasLoaderArg(args) &&
      (Package.get(realProcess.cwd()) !== null ||
       Package.get(realpath(filename.slice(0, nodeModulesIndex + 1))) !== null)) {
    return env.sideloaded = true
  }

  // From istanbuljs/nyc.
  return env.sideloaded = isNyc()
}

export default isSideloaded
