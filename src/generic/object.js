import shared from "../shared.js"
import isObjectLike from "../util/is-object-like.js"

function init() {
  const ExObject = shared.external.Object

  const { create, defineProperties } = Object

  return {
    create(proto, properties) {
      if (proto === null ||
          isObjectLike(proto)) {
        return properties === null
          ? create(proto)
          : create(proto, properties)
      }

      return properties == null
        ? new ExObject
        : defineProperties(new ExObject, properties)
    }
  }
}

export default shared.inited
  ? shared.module.GenericObject
  : shared.module.GenericObject = init()
