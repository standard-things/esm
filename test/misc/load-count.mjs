if (typeof global.loadCount === "number") {
  global.loadCount++
} else {
  global.loadCount = 1
}

export default global.loadCount
