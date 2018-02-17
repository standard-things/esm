import GenericRegExp from "../generic/regexp.js"

const cacheNameRegExp = /^[a-z0-9]{16}\.js$/

function isCacheFileName(value) {
  if (typeof value !== "string") {
    return false
  }

  return GenericRegExp.test(cacheNameRegExp, value)
}

export default isCacheFileName
