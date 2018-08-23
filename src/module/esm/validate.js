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
    entry.compileData.enforceTDZ()
  }
}

function isDescendant(sourceEntry, searchEntry, seen) {
  if (sourceEntry.builtin ||
      sourceEntry.type !== TYPE_ESM) {
    return false
  }

  const sourceName = sourceEntry.name

  if (seen &&
      Reflect.has(seen, sourceName)) {
    return false
  } else {
    seen || (seen = { __proto__: null })
  }

  seen[sourceName] = true

  const { children } = sourceEntry
  const searchName = searchEntry.name

  for (const name in children) {
    if (name === searchName ||
        isDescendant(children[name], searchEntry, seen)) {
      return true
    }
  }

  return false
}

function parseDependencies(entry) {
  const { dependencySpecifiers } = entry.compileData
  const mod = entry.module

  for (const specifier in dependencySpecifiers) {
    const childEntry = esmLoad(specifier, mod)

    dependencySpecifiers[specifier].entry =
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

  for (const specifier of compileData.exportedStars) {
    const childEntry = dependencySpecifiers[specifier].entry

    if (! childEntry ||
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
            exportedSpecifier.specifier !== specifier) {
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
}

function validateDependencies(entry) {
  const { dependencySpecifiers } = entry.compileData

  const namedExports =
    entry.package.options.cjs.namedExports &&
    entry.extname !== ".mjs"

  for (const specifier in dependencySpecifiers) {
    const {
      entry:childEntry,
      exportedNames:childExportedNames
    } = dependencySpecifiers[specifier]

    if (! childEntry ||
        childEntry.builtin) {
      continue
    }

    if (childEntry.type === TYPE_ESM) {
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
      entry.type !== TYPE_ESM) {
    return
  }

  const { compileData, name } = entry
  const mod = entry.module

  const {
    dependencySpecifiers,
    exportedSpecifiers,
    exportedStars
  } = compileData

  if (seen &&
      Reflect.has(seen, name)) {
    const { specifier } =  exportedSpecifiers[exportedName]
    const childEntry = dependencySpecifiers[specifier].entry

    if (exportedStars.indexOf(specifier) === -1) {
      throw new ERR_EXPORT_CYCLE(mod, exportedName)
    } else if (childEntry.compileData.exportedSpecifiers[exportedName] !== true) {
      throw new ERR_EXPORT_MISSING(mod, exportedName)
    }
  } else if (Reflect.has(exportedSpecifiers, exportedName)) {
    const exportedSpecifier = exportedSpecifiers[exportedName]

    if (exportedSpecifier) {
      if (exportedSpecifier !== true) {
        const { local, specifier } = exportedSpecifier
        const childEntry = dependencySpecifiers[specifier].entry

        if (childEntry) {
          seen || (seen = { __proto__: null })
          seen[name] = true
          validateExportedName(childEntry, local, seen)
        }
      }
    } else {
      throw new ERR_EXPORT_STAR_CONFLICT(mod, exportedName)
    }
  } else {
    let throwExportMissing = true

    for (const specifier of exportedStars) {
      const childEntry = dependencySpecifiers[specifier].entry

      if (! childEntry ||
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
