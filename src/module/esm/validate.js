import ENTRY from "../../constant/entry.js"

import _loadESM from "./_load.js"
import errors from "../../errors.js"
import isMJS from "../../util/is-mjs.js"
import isObject from "../../util/is-object.js"

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
  const { compileData, name } = entry
  const { dependencySpecifiers, exportedSpecifiers } = compileData
  const mod = entry.module

  // Parse children.
  for (const specifier in dependencySpecifiers) {
    const childEntry = _loadESM(specifier, mod)

    dependencySpecifiers[specifier].entry =
    entry.children[childEntry.name] = childEntry

    if (! childEntry.builtin &&
        childEntry.state < STATE_PARSING_COMPLETED) {
      childEntry.state = STATE_PARSING_COMPLETED
    }
  }

  const namedExports =
    entry.package.options.cjs.namedExports &&
    ! isMJS(mod)

  // Validate requested child export names.
  for (const specifier in dependencySpecifiers) {
    const {
      entry:childEntry,
      exportedNames:childExportedNames
    } = dependencySpecifiers[specifier]

    if (childEntry.builtin) {
      continue
    }

    const child = childEntry.module

    if (childEntry.type !== TYPE_ESM) {
      if (! namedExports) {
        const exportedName = childExportedNames
          .find((name) => name !== "default")

        if (exportedName) {
          throw new ERR_EXPORT_MISSING(child, exportedName)
        }
      }

      continue
    }

    if (! entry.cyclical) {
      entry.cyclical = Reflect.has(childEntry.children, name)
    }

    const {
      dependencySpecifiers:childDependencySpecifiers,
      exportedSpecifiers:childExportedSpecifiers,
      exportedStars:childExportedStars
     } = childEntry.compileData

    for (const exportedName of childExportedNames) {
      if (Reflect.has(childExportedSpecifiers, exportedName)) {
        const childExportedSpecifier = childExportedSpecifiers[exportedName]

        if (childExportedSpecifier) {
          const { local, specifier } = childExportedSpecifier
          const childDependencySpecifier = childDependencySpecifiers[specifier]

          const otherEntry = isObject(childDependencySpecifier)
            ? childDependencySpecifier.entry
            : null

          if (! otherEntry ||
              ! otherEntry.compileData ||
              ! otherEntry.compileData.exportedSpecifiers ||
              ! Reflect.has(otherEntry.compileData.exportedSpecifiers, local)) {
            continue
          }

          const {
            dependencySpecifiers:otherDependencySpecifiers,
            exportedSpecifiers:otherExportedSpecifiers
          } = otherEntry.compileData

          const otherDependency = otherDependencySpecifiers[otherExportedSpecifiers[local].specifier]

          if (otherDependency &&
              otherDependency.entry === childEntry) {
            throw new ERR_EXPORT_CYCLE(child, exportedName)
          }

          continue
        }

        throw new ERR_EXPORT_STAR_CONFLICT(mod, exportedName)
      }

      let throwExportMissing = true

      for (const specifier of childExportedStars) {
        if (! Reflect.has(dependencySpecifiers, specifier)) {
          throwExportMissing = false
          break
        }
      }

      if (throwExportMissing) {
        throw new ERR_EXPORT_MISSING(child, exportedName)
      }
    }
  }

  // Resolve export names from star exports.
  for (const specifier of entry.compileData.exportedStars) {
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
