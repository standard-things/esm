import GenericObject from "../generic/object.js"

import assignProperties from "../util/assign-properties.js"
import isModuleNamespaceObject from "../util/is-module-namespace-object.js"
import maskFunction from "../util/mask-function.js"
import shared from "../shared.js"

function init() {
  const ExReflect = shared.external.Reflect

  const {
    defineProperty: exDefineProperty,
    deleteProperty: exDeleteProperty,
    set: exSet
  } = ExReflect

  function wrapBuiltin(builtinFunc) {
    return maskFunction(function (...args) {
      const [target] = args

      try {
        return Reflect.apply(builtinFunc, this, args)
      } catch (e) {
        if (isModuleNamespaceObject(target)) {
          return false
        }

        throw e
      }
    }, builtinFunc)
  }

  const BuiltinReflect = GenericObject.create()

  assignProperties(BuiltinReflect, ExReflect)

  if (typeof exDefineProperty === "function") {
    BuiltinReflect.defineProperty = wrapBuiltin(exDefineProperty)
  }

  if (typeof exDeleteProperty === "function") {
    BuiltinReflect.deleteProperty = wrapBuiltin(exDeleteProperty)
  }

  if (typeof exSet === "function") {
    BuiltinReflect.set = wrapBuiltin(exSet)
  }

  return BuiltinReflect
}

export default shared.inited
  ? shared.module.builtinReflect
  : shared.module.builtinReflect = init()
