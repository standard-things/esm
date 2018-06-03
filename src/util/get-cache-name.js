import { version as nodeVersion, versions } from "../safe/process.js"

import ESM from "../constant/esm.js"

import md5 from "./md5.js"

const {
  PKG_VERSION
} = ESM

const engineVersion =
  versions.v8 ||
  versions.chakracore

function getCacheName(entry, cacheKey) {
  let { filename } = entry.module

  if (typeof filename !== "string") {
    filename = ""
  }

  // While MD5 isn't suitable for verification of untrusted data,
  // it's great for revving files. See Sufian Rhazi's post for more details.
  // https://blog.risingstack.com/automatic-cache-busting-for-your-css/
  const pathHash = md5(filename)

  const stateHash = md5(
    nodeVersion + "\0" +
    engineVersion + "\0" +
    PKG_VERSION + "\0" +
    JSON.stringify(entry.package.options) + "\0" +
    cacheKey
  )

  return pathHash.slice(0, 8) +
    stateHash.slice(0, 8) + ".js"
}

export default getCacheName
