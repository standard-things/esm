import ESM from "../constant/esm.js"

import md5 from "./md5.js"
import relative from "../path/relative.js"
import shared from "../shared.js"

function init() {
  const {
    PACKAGE_VERSION
  } = ESM

  const EMPTY_MD5_HASH = "d41d8cd98f00b204e9800998ecf8427e"

  function getCacheName(cacheKey, options = {}) {
    const { cachePath, filename } = options

    let pathHash = EMPTY_MD5_HASH

    if (typeof cachePath === "string" &&
        typeof filename === "string") {
      // While MD5 isn't suitable for verification of untrusted data,
      // it's great for revving files. See Sufian Rhazi's post for more details.
      // https://blog.risingstack.com/automatic-cache-busting-for-your-css/
      pathHash = md5(relative(cachePath, filename))
    }

    const stateHash = md5(
      PACKAGE_VERSION + "\0" +
      JSON.stringify(options.packageOptions) + "\0" +
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
