import shared from "../shared.js"

function init() {
  function getCacheStateHash(cacheName) {
    // Slice out the file extension, which is 3 characters long, to get the
    // last remaining 8 characters.
    return typeof cacheName === "string"
      ? cacheName.slice(-11, -3)
      : ""
  }

  return getCacheStateHash
}

export default shared.inited
  ? shared.module.utilGetCacheStateHash
  : shared.module.utilGetCacheStateHash = init()
