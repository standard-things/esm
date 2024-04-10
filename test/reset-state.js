import path from "path"
import require2 from "./require.js"

const loadCountPathJS = path.resolve("fixture/load-count.js")
const loadCountPathMJS = path.resolve("fixture/load-count.mjs")
const originalExtensions = Object.assign({}, require2.extensions)

function resetState() {
  Reflect.deleteProperty(global, "customError")
  Reflect.deleteProperty(global, "loadCount")
  Reflect.deleteProperty(global, "this")

  const { cache, extensions } = require2

  Reflect.deleteProperty(cache, loadCountPathJS)
  Reflect.deleteProperty(cache, loadCountPathMJS)

  const names = Object.keys(extensions)

  for (const name of names) {
    Reflect.deleteProperty(extensions, name)
  }

  Object.assign(extensions, originalExtensions)
}

export default resetState
