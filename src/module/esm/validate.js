import NullObject from "../../null-object.js"

import _loadESM from "./_load.js"
import builtinEntries from "../../builtin-entries.js"
import errors from "../../errors.js"

function validate(entry) {
  const children = new NullObject
  const compileData = entry.package.cache[entry.cacheFileName]
  const mod = entry.module

  const { exportSpecifiers, moduleSpecifiers } = compileData
  const { namedExports } = entry.package.options.cjs

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

  // Validate requested child export names.
  for (const name in children) {
    const childEntry = children[name]
    const requestedExportNames = moduleSpecifiers[name]

    if (! childEntry.esm) {
      if (! namedExports &&
          requestedExportNames.length &&
          (requestedExportNames.length > 1 ||
           requestedExportNames[0] !== "default")) {
        throw new errors.SyntaxError("ERR_EXPORT_MISSING", childEntry.module, requestedExportNames[0])
      }

      continue
    }

    const childData = childEntry.package.cache[childEntry.cacheFileName]

    for (const requestedName of requestedExportNames) {
      const { exportSpecifiers:childExportSpecifiers } = childData

      if (requestedName in childExportSpecifiers) {
        if (childExportSpecifiers[requestedName] < 3) {
          continue
        }

        throw new errors.SyntaxError("ERR_EXPORT_STAR_CONFLICT", mod, requestedName)
      }

      const { exportStarNames:childExportStarNames } = childData
      let throwExportMissing = true

      for (const childStarName of childExportStarNames) {
        if (! (childStarName in children)) {
          throwExportMissing = false
          break
        }
      }

      if (throwExportMissing) {
        throw new errors.SyntaxError("ERR_EXPORT_MISSING", childEntry.module, requestedName)
      }
    }
  }

  // Resolve export names from star exports.
  for (const starName of compileData.exportStarNames) {
    if (! (starName in children)) {
      continue
    }

    const childEntry = children[starName]

    if (! childEntry.esm) {
      continue
    }

    for (const exportName in childEntry.package.cache[childEntry.cacheFileName].exportSpecifiers) {
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
