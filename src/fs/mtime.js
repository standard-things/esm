import GenericDate from "../generic/date.js"

import { statSync } from "fs"

const { round } = Math

function mtime(filename) {
  if (typeof filename === "string") {
    try {
      const stat = statSync(filename)
      const { mtimeMs } = stat

      // Add 0.5 to avoid rounding down.
      // https://github.com/nodejs/node/pull/12607
      return typeof mtimeMs === "number"
        ? round(mtimeMs + 0.5)
        : GenericDate.getTime(stat.mtime)
    } catch (e) {}
  }

  return -1
}

export default mtime
