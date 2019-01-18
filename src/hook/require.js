import Loader from "../loader.js"
import Package from "../package.js"

import { dirname } from "../safe/path.js"
import errors from "../errors.js"
import dualResolveFilename from "../module/internal/dual-resolve-filename.js"
import esmParseLoad from "../module/esm/parse-load.js"
import esmResolveFilename from "../module/esm/resolve-filename.js"
import makeRequireFunction from "../module/internal/make-require-function.js"
import validateString from "../util/validate-string.js"

const {
  ERR_INVALID_ARG_VALUE
} = errors

function hook(parent) {
  function requirer(request) {
    validateString(request, "request")

    if (request === "") {
      throw new ERR_INVALID_ARG_VALUE("request",  request, "must be a non-empty string")
    }

    const filename = dualResolveFilename(request, parent)
    const defaultPkg = Loader.state.package.default
    const dirPath = dirname(filename)

    if (Package.get(dirPath) === defaultPkg) {
      // Clone the default package to avoid the parsing phase fallback path
      // of module/internal/compile.
      Package.set(dirPath, defaultPkg.clone())
    }

    return esmParseLoad(request, parent, false).module.exports
  }

  function resolver(request, options) {
    return esmResolveFilename(request, parent, false, options)
  }

  const req = makeRequireFunction(parent, requirer, resolver)

  req.main = Loader.state.module.mainModule

  return req
}

export default hook
