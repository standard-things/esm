const cacheNameRegExp = /^[a-z0-9]{16}\.(?:js|gz)$/

function isCacheFileName(value) {
  return typeof value === "string" &&
    cacheNameRegExp.test(value)
}

export default isCacheFileName
