import shared from "../shared.js"

function init() {
  function isTopLevel(path, name, map) {
    let result = false

    path.getParentNode((parent) => {
      const { type } = parent

      let cache = map.get(parent)

      if (cache === void 0) {
        cache = new Map
        map.set(parent, cache)
      }

      let cached = cache.get(name)

      if (cached !== void 0) {
        return result = cached
      }

      if (type === "Program") {
        result = true
        cache.set(name, result)

        return true
      }

      cache.set(name, false)

      if (type === "BlockStatement") {
        return true
      }
    })

    return result
  }

  return isTopLevel
}

export default shared.inited
  ? shared.module.parseIsTopLevel
  : shared.module.parseIsTopLevel = init()
