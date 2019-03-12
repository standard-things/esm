import ENV from "./constant/env.js"

import Module from "./module.js"
import Package from "./package.js"

import esmExtensions from "./module/esm/extensions.js"
import realProcess from "./real/process.js"
import setDeferred from "./util/set-deferred.js"
import setPrototypeOf from "./util/set-prototype-of.js"
import shared from "./shared.js"

const {
  FLAGS
} = ENV

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
          breakFirstLine:
            FLAGS.inspectBrk &&
            ! FLAGS.eval,
          extensions: esmExtensions,
          globalPaths: Array.from(Module.globalPaths),
          mainModule: realProcess.mainModule,
          moduleCache: { __proto__: null },
          scratchCache: { __proto__: null }
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

setPrototypeOf(Loader.prototype, null)

export default Loader
