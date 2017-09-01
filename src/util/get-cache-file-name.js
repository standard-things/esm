import extname from "../path/extname.js"
import md5 from "./md5.js"
import { version } from "../version.js"

const { stringify } = JSON

function getCacheFileName(filePath, cacheKey, pkgInfo) {
  // While MD5 is not suitable for verification of untrusted data,
  // it is great for revving files. See Sufian Rhazi's post for more details
  // https://blog.risingstack.com/automatic-cache-busting-for-your-css/.
  const pathHash = md5(filePath)
  const stateHash = md5(
    version + "\0" +
    stringify(pkgInfo.options) + "\0" +
    cacheKey
  )

  const ext = typeof filePath === "string" ? extname(filePath) : ".js"
  return pathHash.slice(0, 8) + stateHash.slice(0, 8) + ext
}

export default getCacheFileName
