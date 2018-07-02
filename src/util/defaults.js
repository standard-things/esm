import shared from "../shared.js"

function init() {
  const { hasOwnProperty } = Object.prototype

  function defaults(object) {
    const { length } = arguments

    let i = 0

    while (++i < length) {
      const source = arguments[i]

      for (const name in source) {
        if (hasOwnProperty.call(source, name) &&
            (object[name] === void 0 ||
            ! hasOwnProperty.call(object, name))) {
          object[name] = source[name]
        }
      }
    }

    return object
  }

  return defaults
}

export default shared.inited
  ? shared.module.utilDefaults
  : shared.module.utilDefaults = init()
