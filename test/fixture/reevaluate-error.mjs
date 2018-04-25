if (typeof global.loadCount === "number") {
  global.loadCount += 1
} else {
  global.loadCount = 1
  throw new Error
}
