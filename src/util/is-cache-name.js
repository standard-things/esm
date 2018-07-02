import shared from "../shared.js"

function init() {
  const cacheNameRegExp = /^[a-z0-9]{16}\.js$/

  function isCacheName(value) {
    return typeof value === "string" &&
      cacheNameRegExp.test(value)
  }

  return isCacheName
}

export default shared.inited
  ? shared.module.utilIsCacheName
  : shared.module.utilIsCacheName = init()
