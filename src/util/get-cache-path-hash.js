import shared from "../shared.js"

function init() {
  function getCachePathHash(cacheName) {
    return typeof cacheName === "string"
      ? cacheName.slice(0, 8)
      : ""
  }

  return getCachePathHash
}

export default shared.inited
  ? shared.module.utilGetCachePathHash
  : shared.module.utilGetCachePathHash = init()
