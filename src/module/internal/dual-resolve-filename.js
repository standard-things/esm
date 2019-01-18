import Module from "../../module.js"

import esmResolveFilename from "../esm/resolve-filename.js"

function dualResolveFilename(request, parent, isMain, options) {
  let error

  try {
    return esmResolveFilename(request, parent, isMain, options)
  } catch (e) {
    error = e
  }

  try {
    return Module._resolveFilename(request, parent, isMain, options)
  } catch {}

  throw error
}

export default dualResolveFilename
