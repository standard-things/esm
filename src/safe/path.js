import realPath from "../real/path.js"
import safe from "../util/safe.js"
import shared from "../shared.js"

const safePath = shared.inited
  ? shared.module.safePath
  : shared.module.safePath = safe(realPath)

export const {
  basename,
  delimiter,
  dirname,
  extname,
  isAbsolute,
  normalize,
  relative,
  resolve,
  sep,
  toNamespacedPath
} = safePath

export default safePath
