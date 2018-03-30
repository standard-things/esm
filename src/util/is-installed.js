import ENV from "../constant/env.js"

const {
  WIN32
} = ENV

const nodeModulesRegExp = WIN32
  ? /[\\/]node_modules[\\/]/
  : /\/node_modules\//

function isInstalled(mod) {
  const { filename } = mod

  return typeof filename !== "string" ||
    nodeModulesRegExp.test(filename)
}

export default isInstalled
