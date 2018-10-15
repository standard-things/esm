import shared from "../shared.js"
import isObjectLike from "../util/is-object-like.js"

function init() {
  const ExObject = shared.external.Object

  return {
    create(proto, properties) {
      if (properties === null) {
        properties = void 0
      }

      if (proto === null ||
          isObjectLike(proto)) {
        return Object.create(proto, properties)
      }

      return properties === void 0
        ? new ExObject
        : Object.defineProperties(new ExObject, properties)
    }
  }
}

export default shared.inited
  ? shared.module.GenericObject
  : shared.module.GenericObject = init()
