import builtinEntries from "../builtin-entries.js"
import loadESM from "../module/esm/load.js"
import makeRequireFunction from "../module/make-require-function.js"

function hook(parent) {
  return makeRequireFunction(parent, (request) =>
    request in builtinEntries
        ? builtinEntries.module.exports
        : loadESM(request, parent, false).module.exports
  )
}

export default hook
