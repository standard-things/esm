import errors from "../../errors.js"
import has from "../../util/has.js"
import shared from "../../shared.js"

function init() {
  const {
    ERR_EXPORT_MISSING
  } = errors

  function validateShallow(entry, parentEntry) {
    const cache = entry._validation
    const settersMap = entry.setters

    let namespace

    for (const exportedName in settersMap) {
      const cached = cache.get(exportedName)

      if (cached === true) {
        continue
      }

      if (namespace === void 0) {
        namespace = entry.getExportByName("*", parentEntry)
      }

      if (has(namespace, exportedName)) {
        cache.set(exportedName, true)
        continue
      }

      cache.set(exportedName, false)

      const setters = settersMap[exportedName]
      const setterIndex = setters.findIndex(({ owner }) => owner === parentEntry)

      if (setterIndex !== -1) {
        // Remove problematic setter to unblock subsequent imports.
        setters.splice(setterIndex, 1)

        throw new ERR_EXPORT_MISSING(entry.module, exportedName)
      }
    }
  }

  return validateShallow
}

export default shared.inited
  ? shared.module.moduleEsmValidateShallow
  : shared.module.moduleEsmValidateShallow = init()
