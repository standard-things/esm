import Module from "./module.js"
import Package from "./package.js"

import esmExtensions from "./module/esm/extensions.js"
import setDeferred from "./util/set-deferred.js"
import shared from "./shared.js"

class Loader {
  // TODO: Remove this eslint comment when the false positive is resolved.
  // eslint-disable-next-line no-undef
  static state = null

  static init(cacheKey) {
    const { loader } = shared

    let cached = loader.get(cacheKey)

    if (cached === void 0) {
      cached = {
        module: {
          extensions: esmExtensions,
          globalPaths: Array.from(Module.globalPaths),
          mainModule: null,
          moduleCache: { __proto__: null },
          scratchCache: new Proxy({ __proto__: null }, {
            get(scratchCache, name) {
              return Reflect.has(scratchCache, name)
                ? scratchCache[name]
                : Module._cache[name]
            }
          })
        },
        package: {
          cache: new Map,
          default: null
        }
      }

      loader.set(cacheKey, cached)
    }

    return Loader.state = cached
  }
}

setDeferred(Loader, "state", () =>
  Loader.init(JSON.stringify(Package.createOptions()))
)

Reflect.setPrototypeOf(Loader.prototype, null)

export default Loader
