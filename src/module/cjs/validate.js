import constructStackless from "../../error/construct-stackless.js"
import errors from "../../errors.js"

const {
  ERR_EXPORT_MISSING
} = errors

function validate(entry) {
  const { children } = entry

  const namedExports =
    entry.package.options.cjs.namedExports &&
    entry.extname !== ".mjs"

  for (const name in children) {
    const childEntry = children[name]

    if (! namedExports) {
      continue
    }

    const { getters } = childEntry
    const settersMap = childEntry.setters

    for (const exportedName in settersMap) {
      if (exportedName === "*") {
        continue
      }

      if (Reflect.has(getters, exportedName)) {
        let getter = getters[exportedName]

        if (! getter.deferred) {
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
          continue
        }
      }

      const setters = settersMap[exportedName]
      const setterIndex = getSetterIndex(setters, entry)

      if (setterIndex !== -1) {
        // Remove problematic setter to unblock subsequent imports.
        setters.splice(setterIndex, 1)
        throw constructStackless(ERR_EXPORT_MISSING, [childEntry.module, exportedName])
      }
    }
  }
}

function getSetterIndex(setters, parentEntry) {
  const { length } = setters

  let i = -1

  while (++i < length) {
    if (setters[i].parent === parentEntry) {
      return i
    }
  }

  return -1
}

export default validate
