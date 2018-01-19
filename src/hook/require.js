import builtinEntries from "../builtin-entries.js"
import loadESM from "../module/esm/load.js"
import makeRequireFunction from "../module/make-require-function.js"
import resolveFilename from "../module/esm/resolve-filename.js"

function hook(parent) {
  function requirer(request) {
    return request in builtinEntries
      ? builtinEntries.module.exports
      : loadESM(request, parent, false).module.exports
  }

  function resolver(request, options) {
    return resolveFilename(request, this, false, options)
  }

  return makeRequireFunction(parent, requirer, resolver)
}

export default hook
