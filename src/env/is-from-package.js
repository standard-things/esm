import Package from "../package.js"

import hasLoaderArg from "./has-loader-arg.js"
import isFromNyc from "./is-from-nyc.js"
import normalize from "../path/normalize.js"
import realpath from "../fs/realpath.js"
import shared from "../shared.js"

function isFromPackage() {
  const { env } = shared

  if ("isFromPackage" in env) {
    return env.isFromPackage
  }

  const { argv } = process
  const [, filename] = argv
  const args = argv.slice(2)
  const nodeModulesIndex = args.length
    ? normalize(filename).lastIndexOf("/node_modules/")
    : -1

  return env.isFromPackage =
    // From a package like Mocha.
    (nodeModulesIndex !== -1 &&
     hasLoaderArg(args) &&
     (Package.get(process.cwd()) !== null ||
      Package.get(realpath(filename.slice(0, nodeModulesIndex + 1))) !== null)) ||
    // From istanbuljs/nyc.
    isFromNyc()
}

export default isFromPackage
