import NullObject from "../../null-object.js"

import _loadESM from "./_load.js"
import builtinEntries from "../../builtin-entries.js"
import errors from "../../errors.js"

function validate(entry) {
  const cached = entry.package.cache[entry.cacheName]
  const { exportSpecifiers, moduleSpecifiers } = cached

  const children = new NullObject
  const mod = entry.module

  // Parse children.
  for (const name in moduleSpecifiers) {
    if (! (name in builtinEntries)) {
      const childEntry = _loadESM(name, mod)

      children[name] =
      entry.children[childEntry.module.id] = childEntry

      if (childEntry.state < 2) {
        childEntry.state = 2
      }
    }
  }

  const { namedExports } = entry.package.options.cjs

  // Validate requested child export names.
  for (const name in children) {
    const childEntry = children[name]
    const child = childEntry.module
    const childCached = childEntry.package.cache[childEntry.cacheName]
    const childIsESM = childCached && childCached.esm
    const requestedExportNames = moduleSpecifiers[name]

    if (! childIsESM) {
      if (! namedExports &&
          requestedExportNames.length &&
          (requestedExportNames.length > 1 ||
           requestedExportNames[0] !== "default")) {
        throw new errors.SyntaxError("ERR_EXPORT_MISSING", child, requestedExportNames[0])
      }

      continue
    }

    for (const requestedName of requestedExportNames) {
      const { exportSpecifiers:childExportSpecifiers } = childCached

      if (requestedName in childExportSpecifiers) {
        if (childExportSpecifiers[requestedName] < 3) {
          continue
        }

        throw new errors.SyntaxError("ERR_EXPORT_STAR_CONFLICT", mod, requestedName)
      }

      let throwExportMissing = true

      for (const childStarName of childCached.exportStarNames) {
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

    const childEntry = children[starName]
    const childCached = childEntry.package.cache[childEntry.cacheName]
    const childIsESM = childCached && childCached.esm

    if (! childIsESM) {
      continue
    }

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

export default validate
