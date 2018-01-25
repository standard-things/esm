import { extname } from "path"
import md5 from "./md5.js"
import { version as stdVersion } from "../version.js"

const { stringify } = JSON

const nodeVersion = process.version

function getCacheFileName(entry, cacheKey) {
  let { filename } = entry.module

  if (typeof filename !== "string") {
    filename = ""
  }

  let ext = extname(filename)

  if (ext !== ".gz") {
    ext = ".js"
  }

  // While MD5 is not suitable for verification of untrusted data,
  // it is great for revving files. See Sufian Rhazi's post for more details
  // https://blog.risingstack.com/automatic-cache-busting-for-your-css/.
  const pathHash = md5(filename)

  const stateHash = md5(
    nodeVersion + "\0" +
    stdVersion + "\0" +
    stringify(entry.package.options) + "\0" +
    cacheKey
  )

  return pathHash.slice(0, 8) + stateHash.slice(0, 8) + ext
}

export default getCacheFileName
