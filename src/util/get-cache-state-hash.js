function getCacheStateHash(cacheName) {
  return typeof cacheName === "string"
    ? cacheName.slice(-11, -3)
    : ""
}

export default getCacheStateHash
