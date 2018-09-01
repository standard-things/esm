import ESM from "../constant/esm.js"

import md5 from "./md5.js"
import normalize from "../path/normalize.js"
import { relative } from "../safe/path.js"
import shared from "../shared.js"

function init() {
  const {
    PKG_VERSION
  } = ESM

  const EMPTY_MD5_HASH = "d41d8cd98f00b204e9800998ecf8427e"

  function getCacheName(entry, cacheKey) {
    const { filename } = entry.module
    const pkg = entry.package

    // While MD5 isn't suitable for verification of untrusted data,
    // it's great for revving files. See Sufian Rhazi's post for more details.
    // https://blog.risingstack.com/automatic-cache-busting-for-your-css/
    const pathHash = typeof filename === "string"
      ? md5(normalize(relative(pkg.cachePath, filename)))
      : EMPTY_MD5_HASH

    const stateHash = md5(
      PKG_VERSION + "\0" +
      JSON.stringify(pkg.options) + "\0" +
      cacheKey
    )

    return pathHash.slice(0, 8) +
      stateHash.slice(0, 8) + ".js"
  }

  return getCacheName
}

export default shared.inited
  ? shared.module.utilGetCacheName
  : shared.module.utilGetCacheName = init()
