import ENTRY from "../../constant/entry.js"

import _loadESM from "./_load.js"
import builtinEntries from "../../builtin-entries.js"
import errors from "../../errors.js"
import isMJS from "../../util/is-mjs.js"

const {
  STATE_PARSING_COMPLETED,
  TYPE_ESM
} = ENTRY

const {
  ERR_EXPORT_MISSING,
  ERR_EXPORT_STAR_CONFLICT
} = errors

function validate(entry) {
  const { compileData } = entry
  const { dependencySpecifiers, exportSpecifiers } = compileData
  const children = { __proto__: null }
  const mod = entry.module
  const parentName = entry.name

  let isCyclical = false

  // Parse children.
  for (const name in dependencySpecifiers) {
    if (Reflect.has(builtinEntries, name)) {
      continue
    }

    const childEntry =
    children[name] = _loadESM(name, mod)

    entry.children[childEntry.name] = childEntry

    if (childEntry.state < STATE_PARSING_COMPLETED) {
      childEntry.state = STATE_PARSING_COMPLETED
    }
  }

  const namedExports =
    entry.package.options.cjs.namedExports &&
    ! isMJS(mod)

  // Validate requested child export names.
  for (const name in children) {
    const childEntry = children[name]
    const child = childEntry.module
    const requestedExportNames = dependencySpecifiers[name]

    if (childEntry.type !== TYPE_ESM) {
      if (! namedExports &&
          requestedExportNames.length &&
          (requestedExportNames.length > 1 ||
           requestedExportNames[0] !== "default")) {
        throw new ERR_EXPORT_MISSING(child, requestedExportNames.find((requestedName) =>
          requestedName !== "default"
        ))
      }

      continue
    }

    isCyclical =
      isCyclical ||
      Reflect.has(childEntry.children, parentName)

    const childCompileData = childEntry.compileData
    const childExportStars = childCompileData.exportStars

    for (const requestedName of requestedExportNames) {
      const { exportSpecifiers:childExportSpecifiers } = childCompileData

      if (Reflect.has(childExportSpecifiers, requestedName)) {
        if (childExportSpecifiers[requestedName] < 3) {
          continue
        }

        throw new ERR_EXPORT_STAR_CONFLICT(mod, requestedName)
      }

      let throwExportMissing = true

      if (throwExportMissing) {
        for (const childName of childExportStars) {
          if (! Reflect.has(children, childName)) {
            throwExportMissing = false
            break
          }
        }
      }

      if (throwExportMissing) {
        throw new ERR_EXPORT_MISSING(child, requestedName)
      }
    }
  }

  // Resolve export names from star exports.
  for (const childName of entry.compileData.exportStars) {
    if (Reflect.has(builtinEntries, childName)) {
      continue
    }

    const childEntry = children[childName]

    if (childEntry.type !== TYPE_ESM) {
      continue
    }

    for (const exportName in childEntry.compileData.exportSpecifiers) {
      if (Reflect.has(exportSpecifiers, exportName)) {
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

  if (isCyclical) {
    compileData.enforceTDZ()
  }
}

export default validate
