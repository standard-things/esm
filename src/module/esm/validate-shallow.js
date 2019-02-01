import constructStackless from "../../error/construct-stackless.js"
import errors from "../../errors.js"

const {
  ERR_EXPORT_MISSING
} = errors

function validateShallow(entry) {
  if (entry._validatedShallow) {
    return
  }

  entry._validatedShallow = true

  const { children } = entry

  for (const name in children) {
    const childEntry = children[name]
    const cache = childEntry._validation
    const settersMap = childEntry.setters

    let namespace

    for (const exportedName in settersMap) {
      if (exportedName === "*") {
        continue
      }

      const cached = cache.get(exportedName)

      if (cached === true) {
        continue
      }

      if (namespace === void 0) {
        namespace = childEntry.getExportByName("*", entry)
      }

      if (Reflect.has(namespace, exportedName)) {
        cache.set(exportedName, true)
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

export default validateShallow
