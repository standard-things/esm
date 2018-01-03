import Entry from "./entry.js"
import NullObject from "./null-object.js"

import _loadESM from "./module/esm/_load.js"
import builtinModules from "./builtin-modules.js"
import errors from "./errors.js"

const { keys } = Object

function tryParse(entry) {
  const children = new NullObject
  const { exportSpecifiers, module: mod, moduleSpecifiers } = entry
  const { namedExports } = entry.options.cjs
  const names = moduleSpecifiers ? keys(moduleSpecifiers) : []

  // Parse children.
  for (const name of names) {
    if (! (name in builtinModules)) {
      const child = _loadESM(name, mod)
      const childEntry = Entry.get(child)

      childEntry.state = 2
      children[name] = childEntry
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

    for (const requestedName of requestedExportNames) {
      const { exportSpecifiers:childExportSpecifiers } = childEntry

      if (requestedName in childExportSpecifiers) {
        if (childExportSpecifiers[requestedName] < 3) {
          continue
        }

        throw new errors.SyntaxError("ERR_EXPORT_STAR_CONFLICT", mod, requestedName)
      }

      const { exportStarNames:childExportStarNames } = childEntry
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
  for (const starName of entry.exportStarNames) {
    if (! (starName in children)) {
      continue
    }

    const childEntry = children[starName]

    if (! childEntry.esm) {
      continue
    }

    for (const exportName in childEntry.exportSpecifiers) {
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
