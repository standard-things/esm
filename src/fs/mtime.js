import { statSync } from "fs"

const { round } = Math

function mtime(filename) {
  if (typeof filename === "string") {
    try {
      // Add 0.5 to avoid rounding down.
      // https://github.com/nodejs/node/pull/12607
      return round(statSync(filename).mtimeMs + 0.5)
    } catch (e) {}
  }

  return -1
}

export default mtime
