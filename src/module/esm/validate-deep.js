import ENTRY from "../../constant/entry.js"

import constructStackless from "../../error/construct-stackless.js"
import errors from "../../errors.js"

const {
  SETTER_TYPE_EXPORT_FROM,
  TYPE_ESM
} = ENTRY

const {
  ERR_EXPORT_CYCLE,
  ERR_EXPORT_MISSING
} = errors

function validateDeep(entry) {
  if (entry._validatedDeep) {
    return
  }

  entry._validatedDeep = true

  validateDependencies(entry)

  const { children } = entry

  for (const name in children) {
    const childEntry = children[name]

    if (childEntry.type === TYPE_ESM) {
      validateDeep(childEntry)
    }
  }
}

function isCyclicalExport(entry, exportedName, seen) {
  const { name } = entry

  if (seen !== void 0 &&
      seen.has(name)) {
    return true
  }

  if (seen === void 0) {
    seen = new Set
  }

  seen.add(name)

  for (const setter of entry.setters[exportedName]) {
    if (setter.type === SETTER_TYPE_EXPORT_FROM &&
        isCyclicalExport(setter.parent, setter.exportedName, seen)) {
      return true
    }
  }

  return false
}

function validateDependencies(entry) {
  const parentNamedExports =
    entry.extname !== ".mjs" &&
    entry.package.options.cjs.namedExports

  const { children } = entry

  for (const name in children) {
    const childEntry = children[name]

    const noNamedExports =
      ! childEntry.builtin &&
      ! parentNamedExports &&
      childEntry.type !== TYPE_ESM

    const cache = childEntry._validation
    const settersMap = childEntry.setters

    if (childEntry.type === TYPE_ESM) {
      const { getters } = childEntry

      for (const exportedName in settersMap) {
        if (exportedName === "*") {
          continue
        }

        const cached = cache.get(exportedName)

        if (cached === true) {
          continue
        }

        if (Reflect.has(getters, exportedName)) {
          let getter = getters[exportedName]

          if (getter.owner.type !== TYPE_ESM) {
            continue
          }

          if (! getter.deferred) {
            cache.set(exportedName, true)
            continue
          }

          const seen = new Set

          while (getter !== void 0 && getter.deferred) {
            if (seen.has(getter)) {
              getter = void 0
            } else {
              seen.add(getter)
              getter = getter.owner.getters[getter.id]
            }
          }

          if (getter) {
            getters[exportedName] = getter
            cache.set(exportedName, true)
            continue
          }
        }

        cache.set(exportedName, false)

        const setters = settersMap[exportedName]
        const setterIndex = setters.findIndex(({ parent }) => parent === entry)

        if (setterIndex !== -1) {
          const ErrorCtor = isCyclicalExport(childEntry, exportedName)
            ? ERR_EXPORT_CYCLE
            : ERR_EXPORT_MISSING

          // Remove problematic setter to unblock subsequent imports.
          setters.splice(setterIndex, 1)
          throw constructStackless(ErrorCtor, [childEntry.module, exportedName])
        }
      }
    } else if (noNamedExports) {
      for (const exportedName in settersMap) {
        if (exportedName === "*" ||
            exportedName === "default") {
          continue
        }

        cache.set(exportedName, false)

        const setters = settersMap[exportedName]
        const setterIndex = setters.findIndex(({ parent }) => parent === entry)

        if (setterIndex !== -1) {
          // Remove problematic setter to unblock subsequent imports.
          setters.splice(setterIndex, 1)
          throw constructStackless(ERR_EXPORT_MISSING, [childEntry.module, exportedName])
        }
      }
    }
  }
}

export default validateDeep
