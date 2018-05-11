import shared from "../shared.js"

function init() {
  const { __lookupGetter__ } = Object.prototype

  function getGetter(object, name) {
    if (! shared.support.lookupShadowed) {
      const descriptor = Reflect.getOwnPropertyDescriptor(object, name)

      if (! descriptor ||
          ! descriptor.get) {
        return false
      }
    }

    return __lookupGetter__.call(object, name)
  }

  return getGetter
}

export default shared.inited
  ? shared.module.utilGetGetter
  : shared.module.utilGetGetter = init()
