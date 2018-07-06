import shared from "../shared.js"

function init() {
  const ExObject = shared.external.Object

  const { create } = Object

  return {
    create(proto, properties) {
      return proto === void 0
        ? new ExObject
        : create(proto, properties)
    }
  }
}

export default shared.inited
  ? shared.module.GenericObject
  : shared.module.GenericObject = init()
