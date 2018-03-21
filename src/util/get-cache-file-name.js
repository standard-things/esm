import md5 from "./md5.js"
import { version as pkgVersion } from "../version.js"
import shared from "../shared.js"

const { process } = shared

const engineVersion =
  process.versions.v8 ||
  process.versions.chakracore

const nodeVersion = process.version

function getCacheFileName(entry, cacheKey) {
  let { filename } = entry.module

  if (typeof filename !== "string") {
    filename = ""
  }

  // While MD5 is not suitable for verification of untrusted data,
  // it is great for revving files. See Sufian Rhazi's post for more details.
  // https://blog.risingstack.com/automatic-cache-busting-for-your-css/
  const pathHash = md5(filename)

  const stateHash = md5(
    nodeVersion + "\0" +
    engineVersion + "\0" +
    pkgVersion + "\0" +
    JSON.stringify(entry.package.options) + "\0" +
    cacheKey
  )

  return pathHash.slice(0, 8) +
    stateHash.slice(0, 8) + ".js"
}

export default getCacheFileName
