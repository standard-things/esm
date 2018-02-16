import GenericArray from "../generic/array.js"
import GenericString from "../generic/string.js"
import Package from "../package.js"

import hasLoaderArg from "./has-loader-arg.js"
import isNyc from "./is-nyc.js"
import normalize from "../path/normalize.js"
import realpath from "../fs/realpath.js"
import shared from "../shared.js"

function isSideloaded() {
  const { env } = shared

  if ("sideloaded" in env) {
    return env.sideloaded
  }

  const { argv } = process
  const [, filename] = argv
  const args = GenericArray.slice(argv, 2)
  const nodeModulesIndex = args.length
    ? GenericString.lastIndexOf(normalize(filename), "/node_modules/")
    : -1

  return env.sideloaded =
    // From a package like Mocha.
    (nodeModulesIndex !== -1 &&
     hasLoaderArg(args) &&
     (Package.get(process.cwd()) !== null ||
      Package.get(realpath(GenericString.slice(filename, 0, nodeModulesIndex + 1))) !== null)) ||
    // From istanbuljs/nyc.
    isNyc()
}

export default isSideloaded
