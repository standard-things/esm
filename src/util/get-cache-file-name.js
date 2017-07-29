import esmSemVer from "./version.js"
import extname from "./extname.js"
import md5 from "./md5.js"

function getCacheFileName(filePath, cacheKey, pkgInfo) {
  // While MD5 is not suitable for verification of untrusted data,
  // it is great for revving files. See Sufian Rhazi's post for more details
  // https://blog.risingstack.com/automatic-cache-busting-for-your-css/.
  const hash1 = md5(filePath)
  const hash2 = md5(
    esmSemVer.version + "\0" +
    JSON.stringify(pkgInfo.options) + "\0" +
    cacheKey
  )

  const ext = typeof filePath === "string" ? extname(filePath) : ".js"
  return hash1.slice(0, 8) + hash2.slice(0, 8) + ext
}

export default getCacheFileName
