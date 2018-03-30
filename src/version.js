import SemVer from "semver"

import shared from "./shared.js"

function init() {
  // `process.env.ESM_VERSION` is replaced with the `esm` version at build time.
  // https://webpack.js.org/plugins/environment-plugin/
  return new SemVer(process.env.ESM_VERSION)
}

const semver = shared.inited
  ? shared.module.version
  : shared.module.version = init()

export const { major, minor, patch, version } = semver
export const name = "esm@" + version
export default semver
