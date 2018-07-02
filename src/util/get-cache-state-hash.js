import shared from "../shared.js"

function init() {
  function getCacheStateHash(cacheName) {
    return typeof cacheName === "string"
      ? cacheName.slice(-11, -3)
      : ""
  }

  return getCacheStateHash
}

export default shared.inited
  ? shared.module.utilGetCacheStateHash
  : shared.module.utilGetCacheStateHash = init()
