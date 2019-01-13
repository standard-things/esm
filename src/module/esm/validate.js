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

function validate(entry) {
  if (entry.validated) {
    // return
  }

  entry.validated = true

  validateDependencies(entry)

  const { children } = entry

  for (const childName in children) {
    const childEntry = children[childName]

    if (childEntry.type === TYPE_ESM &&
        ! childEntry.validated) {
      validate(childEntry)
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

function isCyclicalExport(entry, exportedName, seen) {
  const { name, setters } = entry

  if (seen !== void 0 &&
      seen.has(name)) {
    return true
  } else if (seen === void 0) {
    seen = new Set
  }

  seen.add(name)

  for (const setter of setters[exportedName]) {
    if (setter.type === SETTER_TYPE_EXPORT_FROM &&
        isCyclicalExport(setter.parent, setter.exportedName, seen)) {
      return true
    }
  }

  return false
}

function validateDependencies(entry) {
  const { children } = entry

  const namedExports =
    entry.package.options.cjs.namedExports &&
    entry.extname !== ".mjs"

  for (const name in children) {
    const childEntry = children[name]

    if (childEntry.builtin) {
      continue
    }

    const settersMap = childEntry.setters

    if (childEntry.type === TYPE_ESM) {
      const { getters } = childEntry

      for (const exportedName in settersMap) {
        if (exportedName === "*") {
          continue
        }

        if (Reflect.has(getters, exportedName)) {
          let getter = getters[exportedName]

          if (! getter.deferred ||
              getter.owner.type !== TYPE_ESM) {
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
          const ErrCtor = isCyclicalExport(childEntry, exportedName)
            ? ERR_EXPORT_CYCLE
            : ERR_EXPORT_MISSING

          // Remove problematic setter to unblock subsequent imports.
          setters.splice(setterIndex, 1)
          throw constructStackless(ErrCtor, [childEntry.module, exportedName])
        }
      }
    } else if (! namedExports) {
      for (const exportedName in settersMap) {
        if (exportedName === "*" ||
            exportedName === "default") {
          continue
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
}

export default validate
