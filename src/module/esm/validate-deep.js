import ENTRY from "../../constant/entry.js"

import constructStackless from "../../error/construct-stackless.js"
import errors from "../../errors.js"
import shared from "../../shared.js"

function init() {
  const {
    LOAD_COMPLETED,
    NAMESPACE_FINALIZATION_DEFERRED,
    SETTER_TYPE_EXPORT_FROM,
    TYPE_CJS,
    TYPE_ESM,
    TYPE_PSEUDO
  } = ENTRY

  const {
    ERR_EXPORT_CYCLE,
    ERR_EXPORT_MISSING
  } = errors

  function validateDeep(entry, seen) {
    const { children } = entry

    for (const name in children) {
      validate(children[name], entry)
    }

    if (seen === void 0) {
      seen = new Set
    } else if (seen.has(entry)) {
      return
    }

    seen.add(entry)

    for (const name in children) {
      const childEntry = children[name]

      if (childEntry.type === TYPE_ESM) {
        validateDeep(childEntry, seen)
      }
    }
  }

  function isCyclicalExport(entry, exportedName, seen) {
    const { name } = entry

    if (seen === void 0) {
      seen = new Set
    } else if (seen.has(name)) {
      return true
    }

    seen.add(name)

    for (const setter of entry.setters[exportedName]) {
      if (setter.type === SETTER_TYPE_EXPORT_FROM &&
          isCyclicalExport(setter.owner, setter.exportedName, seen)) {
        return true
      }
    }

    return false
  }

  function validate(entry, parentEntry) {
    const parentIsMJS = parentEntry.extname === ".mjs"

    const parentNamedExports =
      parentEntry.package.options.cjs.namedExports &&
      ! parentIsMJS

    if (entry._namespaceFinalized === NAMESPACE_FINALIZATION_DEFERRED) {
      return
    }

    const { type } = entry
    const isCJS = type === TYPE_CJS
    const isESM = type === TYPE_ESM
    const isPseudo = type === TYPE_PSEUDO
    const isLoaded = entry._loaded === LOAD_COMPLETED

    const defaultOnly =
      (isCJS &&
      ! parentNamedExports &&
      ! entry.builtin) ||
      (isPseudo &&
      parentIsMJS)

    if (! isESM &&
        ! defaultOnly &&
        ! isLoaded) {
      return
    }

    const cache = entry._validation
    const { getters } = entry
    const settersMap = entry.setters

    let namespace

    for (const exportedName in settersMap) {
      if (defaultOnly &&
          exportedName === "default") {
        continue
      }

      const cached = cache.get(exportedName)

      if (cached === true) {
        continue
      }

      if (namespace === void 0) {
        namespace = isLoaded
          ? entry.getExportByName("*", parentEntry)
          : entry.getters
      }

      if (Reflect.has(namespace, exportedName)) {
        let getter = getters[exportedName]

        const { owner } = getter

        if (owner.type !== TYPE_ESM &&
            owner._loaded !== LOAD_COMPLETED) {
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

        if (getter !== void 0) {
          getters[exportedName] = getter
          cache.set(exportedName, true)
          continue
        }
      }

      cache.set(exportedName, false)

      const setters = settersMap[exportedName]
      const setterIndex = setters.findIndex(({ owner }) => owner === parentEntry)

      if (setterIndex !== -1) {
        const ErrorCtor = isCyclicalExport(entry, exportedName)
          ? ERR_EXPORT_CYCLE
          : ERR_EXPORT_MISSING

        // Remove problematic setter to unblock subsequent imports.
        setters.splice(setterIndex, 1)
        throw constructStackless(ErrorCtor, [entry.module, exportedName])
      }
    }
  }

  return validateDeep
}

export default shared.inited
  ? shared.module.moduleEsmValidateDeep
  : shared.module.moduleEsmValidateDeep = init()
