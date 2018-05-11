import shared from "../shared.js"

function init() {
  const { __lookupSetter__ } = Object.prototype

  function getSetter(object, name) {
    if (! shared.support.lookupShadowed) {
      const descriptor = Reflect.getOwnPropertyDescriptor(object, name)

      if (! descriptor ||
          ! descriptor.set) {
        return false
      }
    }

    return __lookupSetter__.call(object, name)
  }

  return getSetter
}

export default shared.inited
  ? shared.module.utilGetSetter
  : shared.module.utilGetSetter = init()
