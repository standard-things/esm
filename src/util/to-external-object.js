import setPrototypeOf from "./set-prototype-of.js"
import shared from "../shared.js"

function init() {
  const {
    Array: ExArray,
    Object: ExObject
  } = shared.external

  const ExArrayProto = ExArray.prototype
  const ExObjectProto = ExObject.prototype

  function toExternalObject(object) {
    const proto = Array.isArray(object)
      ? ExArrayProto
      : ExObjectProto

    setPrototypeOf(object, proto)

    return object
  }

  return toExternalObject
}

export default shared.inited
  ? shared.module.utilToExternalObject
  : shared.module.utilToExternalObject = init()
