import _loadESM from "./_load.js"
import builtinEntries from "../../builtin-entries.js"
import errors from "../../errors.js"

const {
  ERR_EXPORT_MISSING,
  ERR_EXPORT_STAR_CONFLICT
} = errors

function validate(entry) {
  const pkg = entry.package
  const cached = pkg.cache.compile[entry.cacheName]
  const { dependencySpecifiers, exportSpecifiers } = cached

  const children = { __proto__: null }
  const mod = entry.module

  // Parse children.
  for (const name in dependencySpecifiers) {
    if (name in builtinEntries) {
      continue
    }

    const childEntry =
    children[name] = _loadESM(name, mod)

    entry.children[childEntry.name] = childEntry

    if (childEntry.state < 2) {
      childEntry.state = 2
    }
  }

  const { namedExports } = pkg.options.cjs

  // Validate requested child export names.
  for (const name in children) {
    const childEntry = children[name]
    const child = childEntry.module
    const childPkg = childEntry.package
    const childCached = childPkg.cache.compile[childEntry.cacheName]
    const childIsESM = childCached && childCached.esm
    const requestedExportNames = dependencySpecifiers[name]

    if (! childIsESM) {
      if (! namedExports &&
          requestedExportNames.length &&
          (requestedExportNames.length > 1 ||
           requestedExportNames[0] !== "default")) {
        throw new ERR_EXPORT_MISSING(child, requestedExportNames[0])
      }

      continue
    }

    const childExportStars = childCached.exportStars
    const skipExportMissing = childPkg.options.cjs.vars

    for (const requestedName of requestedExportNames) {
      const { exportSpecifiers:childExportSpecifiers } = childCached

      if (requestedName in childExportSpecifiers) {
        if (childExportSpecifiers[requestedName] < 3) {
          continue
        }

        throw new ERR_EXPORT_STAR_CONFLICT(mod, requestedName)
      }

      let throwExportMissing = ! skipExportMissing

      if (throwExportMissing) {
        for (const childName of childExportStars) {
          if (! (childName in children)) {
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
  for (const childName of cached.exportStars) {
    if (childName in builtinEntries) {
      continue
    }

    const childEntry = children[childName]
    const childCached = childEntry.package.cache.compile[childEntry.cacheName]
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
