import ENTRY from "../../constant/entry.js"

import _loadESM from "./_load.js"
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
  const { compileData, name } = entry
  const { dependencySpecifiers, exportedSpecifiers } = compileData
  const children = { __proto__: null }
  const mod = entry.module

  // Parse children.
  for (const specifier in dependencySpecifiers) {
    const childEntry = _loadESM(specifier, mod)

    entry.children[childEntry.name] = childEntry

    if (childEntry.builtin) {
      continue
    }

    if (childEntry.state < STATE_PARSING_COMPLETED) {
      childEntry.state = STATE_PARSING_COMPLETED
    }

    children[specifier] = childEntry
  }

  const namedExports =
    entry.package.options.cjs.namedExports &&
    ! isMJS(mod)

  // Validate requested child export names.
  for (const specifier in children) {
    const childEntry = children[specifier]
    const child = childEntry.module
    const requestedExportNames = dependencySpecifiers[specifier].exportedNames

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

    if (! entry.cyclical) {
      entry.cyclical = Reflect.has(childEntry.children, name)
    }

    const childCompileData = childEntry.compileData
    const childExportedStars = childCompileData.exportedStars

    for (const requestedName of requestedExportNames) {
      const { exportedSpecifiers:childExportedSpecifiers } = childCompileData

      if (Reflect.has(childExportedSpecifiers, requestedName)) {
        if (childExportedSpecifiers[requestedName]) {
          continue
        }

        throw new ERR_EXPORT_STAR_CONFLICT(mod, requestedName)
      }

      let throwExportMissing = true

      if (throwExportMissing) {
        for (const childSpecifier of childExportedStars) {
          if (! Reflect.has(children, childSpecifier)) {
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
  for (const specifier of entry.compileData.exportedStars) {
    const childEntry = children[specifier]

    if (! childEntry ||
        childEntry.type !== TYPE_ESM) {
      continue
    }

    for (const exportedName in childEntry.compileData.exportedSpecifiers) {
      if (exportedName === "default") {
        continue
      }

      if (Reflect.has(exportedSpecifiers, exportedName)) {
        if (exportedSpecifiers[exportedName] !== true) {
          // Export specifier is conflicted.
          exportedSpecifiers[exportedName] = false
        }
      } else {
        // Export specifier is imported.
        exportedSpecifiers[exportedName] = {
          local: exportedName,
          specifier
        }
      }
    }
  }

  if (entry.cyclical) {
    compileData.enforceTDZ()
  }

  const { _namespace } = entry

  for (const exportedName in exportedSpecifiers) {
    _namespace[exportedName] = void 0
  }

  entry.initNamespace()
}

export default validate
