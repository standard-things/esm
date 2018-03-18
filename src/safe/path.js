import path from "path"
import safe from "../util/safe.js"
import shared from "../shared.js"

const safePath = shared.inited
  ? shared.module.safePath
  : shared.module.safePath = safe(path)

export const {
  basename,
  delimiter,
  dirname,
  extname,
  isAbsolute,
  normalize,
  resolve
} = safePath

export default safePath
