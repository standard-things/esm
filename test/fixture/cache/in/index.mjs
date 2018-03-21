if (typeof global.loadCount === "number") {
  global.loadCount += 1
} else {
  global.loadCount = 1
}

export default global.loadCount
