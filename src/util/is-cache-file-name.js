const cacheNameRegExp = /^[a-z0-9]{16}\.js$/

function isCacheFileName(value) {
  if (typeof value !== "string") {
    return false
  }

  return cacheNameRegExp.test(value)
}

export default isCacheFileName
