import shared from "../shared.js"

function init() {
  const { __lookupSetter__ } = Object.prototype

  function getSetter(object, name) {
    const useAsDescriptor = name === void 0

    if (useAsDescriptor ||
        ! shared.support.lookupShadowed) {
      const descriptor = useAsDescriptor
        ? object
        : Reflect.getOwnPropertyDescriptor(object, name)

      if (descriptor !== void 0) {
        return descriptor.set
      }

      if (useAsDescriptor) {
        return
      }
    }

    return __lookupSetter__.call(object, name)
  }

  return getSetter
}

export default shared.inited
  ? shared.module.utilGetSetter
  : shared.module.utilGetSetter = init()
