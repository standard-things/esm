import has from "./has.js"

function isObjectEmpty(object) {
  for (const name in object) {
    if (has(object, name)) {
      return false
    }
  }

  return true
}

export default isObjectEmpty
