function getCachePathHash(cacheName) {
  return typeof cacheName === "string"
    ? cacheName.slice(0, 8)
    : ""
}

export default getCachePathHash
