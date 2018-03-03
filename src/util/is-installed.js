import shared from "../shared.js"

const nodeModulesRegExp = shared.env.win32
  ? /[\\/]node_modules[\\/]/
  : /\/node_modules\//

function isInstalled(mod) {
  const { filename } = mod

  return typeof filename !== "string" ||
    nodeModulesRegExp.test(filename)
}

export default isInstalled
