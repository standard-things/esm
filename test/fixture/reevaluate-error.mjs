if (typeof global.loadCount === "number") {
  global.loadCount++
} else {
  global.loadCount = 1
}

if (! global.evaluated) {
  global.evaluated = true
  throw new Error
}
