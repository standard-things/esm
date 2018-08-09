import GenericObject from "../generic/object.js"

import assignProperties from "../util/assign-properties.js"
import isModuleNamespaceObject from "../util/is-module-namespace-object.js"
import maskFunction from "../util/mask-function.js"
import shared from "../shared.js"

function init() {
  function defineProperty(target, name, descriptor)  {
    try {
      return Reflect.defineProperty(target, name, descriptor)
    } catch (e) {
      if (isModuleNamespaceObject(target)) {
        return false
      }

      throw e
    }
  }

  function deleteProperty(target, name)  {
    try {
      return Reflect.deleteProperty(target, name)
    } catch (e) {
      if (isModuleNamespaceObject(target)) {
        return false
      }

      throw e
    }
  }

  function set(target, name, value, receiver) {
    try {
      return Reflect.set(target, name, value, receiver)
    } catch (e) {
      if (isModuleNamespaceObject(target)) {
        return false
      }

      throw e
    }
  }

  const ExReflect = shared.external.Reflect

  const {
    defineProperty: exDefineProperty,
    deleteProperty: exDeleteProperty,
    set: exSet
  } = ExReflect

  const BuiltinReflect = GenericObject.create()

  assignProperties(BuiltinReflect, ExReflect)

  if (typeof exDefineProperty === "function") {
    BuiltinReflect.defineProperty = maskFunction(defineProperty, exDefineProperty)
  }

  if (typeof exDeleteProperty === "function") {
    BuiltinReflect.deleteProperty = maskFunction(deleteProperty, exDeleteProperty)
  }

  if (typeof exSet === "function") {
    BuiltinReflect.set = maskFunction(set, exSet)
  }

  return BuiltinReflect
}

export default shared.inited
  ? shared.module.builtinReflect
  : shared.module.builtinReflect = init()
