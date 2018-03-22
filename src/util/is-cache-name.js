const cacheNameRegExp = /^[a-z0-9]{16}\.js$/

function isCacheName(value) {
  return typeof value === "string" &&
    cacheNameRegExp.test(value)
}

export default isCacheName
