import ENTRY from "../../constant/entry.js"

import constructStackless from "../../error/construct-stackless.js"
import errors from "../../errors.js"

const {
  TYPE_ESM
} = ENTRY

const {
  ERR_EXPORT_MISSING
} = errors

function validateShallow(entry) {
  if (entry._validatedShallow) {
    return
  }

  entry._validatedShallow = true

  const parentNamedExports =
    entry.package.options.cjs.namedExports &&
    entry.extname !== ".mjs"

  const { children } = entry

  for (const name in children) {
    const childEntry = children[name]

    const noNamedExports =
      ! childEntry.builtin &&
      ! parentNamedExports &&
      childEntry.type !== TYPE_ESM

    if (noNamedExports) {
      continue
    }

    const cache = childEntry._validation
    const { getters } = childEntry
    const settersMap = childEntry.setters

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
        // Remove problematic setter to unblock subsequent imports.
        setters.splice(setterIndex, 1)
        throw constructStackless(ERR_EXPORT_MISSING, [childEntry.module, exportedName])
      }
    }
  }
}

export default validateShallow
