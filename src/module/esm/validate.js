import ENTRY from "../../constant/entry.js"

import errors from "../../errors.js"
import esmLoad from "./load.js"

const {
  STATE_PARSING_COMPLETED,
  TYPE_ESM
} = ENTRY

const {
  ERR_EXPORT_CYCLE,
  ERR_EXPORT_MISSING,
  ERR_EXPORT_STAR_CONFLICT
} = errors

function validate(entry) {
  parseDependencies(entry)
  resolveExportedStars(entry)
  validateDependencies(entry)

  if (isDescendant(entry, entry)) {
    entry.circular = true
    entry.compileData.enforceTDZ()
  }
}

function isDescendant(entry, parentEntry, seen) {
  if (entry.builtin ||
      entry.type !== TYPE_ESM) {
    return false
  }

  const parentName = parentEntry.name

  if (seen !== void 0 &&
      seen.has(parentName)) {
    return false
  } else if (seen === void 0) {
    seen = new Set
  }

  seen.add(parentName)

  const { children } = parentEntry
  const { name } = entry

  for (const childName in children) {
    if (childName === name ||
        isDescendant(entry, children[childName], seen)) {
      return true
    }
  }

  return false
}

function parseDependencies(entry) {
  const { dependencySpecifiers } = entry.compileData
  const mod = entry.module

  for (const request in dependencySpecifiers) {
    const childEntry = esmLoad(request, mod)

    dependencySpecifiers[request].entry =
    entry.children[childEntry.name] = childEntry

    if (! childEntry.builtin &&
        childEntry.state < STATE_PARSING_COMPLETED) {
      childEntry.state = STATE_PARSING_COMPLETED
    }
  }
}

function resolveExportedStars(entry) {
  const { compileData } = entry
  const { dependencySpecifiers, exportedSpecifiers } = compileData

  for (const request of compileData.exportedStars) {
    const childEntry = dependencySpecifiers[request].entry

    if (childEntry === null ||
        childEntry.builtin ||
        childEntry.type !== TYPE_ESM) {
      continue
    }

    for (const exportedName in childEntry.compileData.exportedSpecifiers) {
      if (exportedName === "default") {
        continue
      }

      if (Reflect.has(exportedSpecifiers, exportedName)) {
        const exportedSpecifier = exportedSpecifiers[exportedName]

        if (typeof exportedSpecifier !== "boolean" &&
            exportedSpecifier.request !== request) {
          // Export specifier is conflicted.
          exportedSpecifiers[exportedName] = false
        }
      } else {
        // Export specifier is imported.
        exportedSpecifiers[exportedName] = {
          local: exportedName,
          request
        }
      }
    }
  }
}

function validateDependencies(entry) {
  const { dependencySpecifiers } = entry.compileData

  const namedExports =
    entry.package.options.cjs.namedExports &&
    entry.extname !== ".mjs"

  for (const request in dependencySpecifiers) {
    const {
      entry:childEntry,
      exportedNames:childExportedNames
    } = dependencySpecifiers[request]

    if (childEntry === null ||
        childEntry.builtin) {
      continue
    }

    if (childEntry.type === TYPE_ESM) {
      resolveExportedStars(childEntry)

      for (const exportedName of childExportedNames) {
        validateExportedName(childEntry, exportedName)
      }
    } else if (! namedExports) {
      for (const exportedName of childExportedNames) {
        if (exportedName !== "default") {
          throw new ERR_EXPORT_MISSING(childEntry.module, exportedName)
        }
      }
    }
  }
}

function validateExportedName(entry, exportedName, seen) {
  if (entry.builtin ||
      entry.type !== TYPE_ESM ||
      exportedName === "*") {
    return
  }

  const { compileData, name } = entry
  const mod = entry.module

  const {
    dependencySpecifiers,
    exportedSpecifiers,
    exportedStars
  } = compileData

  const exportedSpecifier = exportedSpecifiers[exportedName]

  if (seen !== void 0 &&
      seen.has(name) &&
      exportedSpecifier !== true) {
    const { request } = exportedSpecifier
    const childEntry = dependencySpecifiers[request].entry

    if (exportedStars.indexOf(request) === -1) {
      throw new ERR_EXPORT_CYCLE(mod, exportedName)
    } else if (childEntry.compileData.exportedSpecifiers[exportedName] !== true) {
      throw new ERR_EXPORT_MISSING(mod, exportedName)
    }
  } else if (Reflect.has(exportedSpecifiers, exportedName)) {
    if (exportedSpecifier) {
      if (exportedSpecifier !== true) {
        const { local, request } = exportedSpecifier
        const childEntry = dependencySpecifiers[request].entry

        if (childEntry !== null) {
          if (seen === void 0) {
            seen = new Set
          }

          seen.add(name)
          validateExportedName(childEntry, local, seen)
        }
      }
    } else {
      throw new ERR_EXPORT_STAR_CONFLICT(mod, exportedName)
    }
  } else {
    let throwExportMissing = true

    for (const request of exportedStars) {
      const childEntry = dependencySpecifiers[request].entry

      if (childEntry === null ||
          childEntry.type !== TYPE_ESM) {
        throwExportMissing = false
        break
      }
    }

    if (throwExportMissing) {
      throw new ERR_EXPORT_MISSING(mod, exportedName)
    }
  }
}

export default validate
