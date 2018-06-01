import ESM from "./constant/esm.js"

import SemVer from "semver"

import shared from "./shared.js"

function init() {
  const {
    PKG_VERSION
  } = ESM

  return new SemVer(PKG_VERSION)
}

const semver = shared.inited
  ? shared.module.version
  : shared.module.version = init()

export const { major, minor, patch, version } = semver
export default semver
