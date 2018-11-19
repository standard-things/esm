import Loader from "../loader.js"

import errors from "../errors.js"
import esmParseLoad from "../module/esm/parse-load.js"
import esmResolveFilename from "../module/esm/resolve-filename.js"
import makeRequireFunction from "../module/internal/make-require-function.js"

const {
  ERR_INVALID_ARG_TYPE,
  ERR_INVALID_ARG_VALUE
} = errors

function hook(parent) {
  function requirer(request) {
    if (typeof request !== "string") {
      throw new ERR_INVALID_ARG_TYPE("request", "string", request)
    }

    if (request === "") {
      throw new ERR_INVALID_ARG_VALUE("request",  request, "must be a non-empty string")
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
