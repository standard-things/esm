import has from "./has.js"

function isEmpty(object) {
  for (const key in object) {
    if (has(object, key)) {
      return false
    }
  }

  return true
}

export default isEmpty
