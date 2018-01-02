import NullObject from "./null-object.js"

import _loadESM from "./module/esm/_load.js"
import builtinModules from "./builtin-modules.js"
import errors from "./errors.js"

const { keys } = Object

const cacheSym = Symbol.for("@std/esm:Module#cache")
const stateSym = Symbol.for("@std/esm:Module#state")

function tryParse(mod, cached) {
  const children = new NullObject
  const { exportSpecifiers, moduleSpecifiers } = cached
  const names = keys(moduleSpecifiers)

  mod[cacheSym] = cached

  // Parse children.
  for (const name of names) {
    if (! (name in builtinModules)) {
      const child = _loadESM(name, mod)
      child[stateSym] = 2

      if (cacheSym in child) {
        children[name] = child
      }
    }
  }

  // Validate requested child export names.
  for (const name in children) {
    const child = children[name]
    const childCached = child[cacheSym]
    const requestedExportNames = moduleSpecifiers[name]

    for (const requestedName of requestedExportNames) {
      if (requestedName === "*") {
        continue
      }

      const { exportSpecifiers:childExportSpecifiers } = childCached

      if (requestedName in childExportSpecifiers) {
        if (childExportSpecifiers[requestedName] < 3) {
          continue
        }

        throw new errors.SyntaxError("ERR_EXPORT_STAR_CONFLICT", mod, requestedName)
      }

      const { exportStarNames:childExportStarNames } = childCached
      let throwExportMissing = true

      for (const childStarName of childExportStarNames) {
        if (! (childStarName in children)) {
          throwExportMissing = false
          break
        }
      }

      if (throwExportMissing) {
        throw new errors.SyntaxError("ERR_EXPORT_MISSING", child, requestedName)
      }
    }
  }

  // Resolve export names from star exports.
  for (const starName of cached.exportStarNames) {
    if (! (starName in children)) {
      continue
    }

    const child = children[starName]
    const childCached = child[cacheSym]

    for (const exportName in childCached.exportSpecifiers) {
      if (exportName in exportSpecifiers) {
        if (exportSpecifiers[exportName] === 2) {
          // Export specifier is conflicted.
          exportSpecifiers[exportName] = 3
        }
      } else {
        // Export specifier is imported.
        exportSpecifiers[exportName] = 2
      }
    }
  }
}

export default tryParse
