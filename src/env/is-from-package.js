import Package from "../package.js"

import hasLoaderArg from "./has-loader-arg.js"
import isFromNyc from "./is-from-nyc.js"
import normalize from "../path/normalize.js"
import realpath from "../fs/realpath.js"
import shared from "../shared.js"

function isFromPackage() {
  if ("isFromPackage" in shared.env) {
    return shared.env.isFromPackage
  }

  const { argv } = process
  const [, filePath] = argv
  const args = argv.slice(2)
  const nodeModulesIndex = args.length
    ? normalize(filePath).lastIndexOf("/node_modules/")
    : -1

  if (nodeModulesIndex !== -1 &&
      hasLoaderArg(args) &&
      (Package.get(process.cwd()) !== null ||
       Package.get(realpath(filePath.slice(0, nodeModulesIndex + 1))) !== null)) {
    // From a package like Mocha.
    return shared.env.isFromPackage = true
  }

  // From istanbuljs/nyc.
  return shared.env.isFromPackage = isFromNyc()
}

export default isFromPackage
