import ENTRY from "../../constant/entry.js"

import constructStackless from "../../error/construct-stackless.js"
import errors from "../../errors.js"

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

function validateDeep(entry) {
  if (entry._validatedDeep) {
    return
  }

  entry._validatedDeep = true

  const { children } = entry

  const parentIsMJS = entry.extname === ".mjs"

  const parentNamedExports =
    entry.package.options.cjs.namedExports &&
    ! parentIsMJS

  for (const name in children) {
    const childEntry = children[name]

    if (childEntry._namespaceFinalized === NAMESPACE_FINALIZATION_DEFERRED) {
      continue
    }

    const childType = childEntry.type
    const childIsCJS = childType === TYPE_CJS
    const childIsESM = childType === TYPE_ESM
    const childIsPseudo = childType === TYPE_PSEUDO
    const childIsLoaded = childEntry._loaded === LOAD_COMPLETED

    const defaultOnly =
      (childIsCJS &&
       ! parentNamedExports &&
       ! childEntry.builtin) ||
      (childIsPseudo &&
       parentIsMJS)

    if (! childIsESM &&
        ! defaultOnly &&
        ! childIsLoaded) {
      continue
    }

    const cache = childEntry._validation
    const { getters } = childEntry
    const settersMap = childEntry.setters

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
        namespace = childIsLoaded
          ? childEntry.getExportByName("*", entry)
          : childEntry._namespace
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
      const setterIndex = setters.findIndex(({ owner }) => owner === entry)

      if (setterIndex !== -1) {
        const ErrorCtor = isCyclicalExport(childEntry, exportedName)
          ? ERR_EXPORT_CYCLE
          : ERR_EXPORT_MISSING

        // Remove problematic setter to unblock subsequent imports.
        setters.splice(setterIndex, 1)
        throw constructStackless(ErrorCtor, [childEntry.module, exportedName])
      }
    }
  }

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
        isCyclicalExport(setter.owner, setter.exportedName, seen)) {
      return true
    }
  }

  return false
}

export default validateDeep
