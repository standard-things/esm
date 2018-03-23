import SemVer from "semver"

import shared from "./shared.js"

function init() {
  // The `process.env.ESM_VERSION` reference is replaced, at build time, with the
  // `esm` version string. See https://webpack.js.org/plugins/environment-plugin/.
  return new SemVer(process.env.ESM_VERSION)
}

const semver = shared.inited
  ? shared.module.version
  : shared.module.version = init()

export const { major, minor, patch, version } = semver
export const name = "esm@" + version
export default semver
