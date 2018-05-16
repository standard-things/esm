import encodeId from "../util/encode-id.js"
import setDeferred from "../util/set-deferred.js"

const { filename } = __non_webpack_module__

const ESM = {
  __proto__: null,
  PKG_PREFIX: encodeId("esm")
}

setDeferred(ESM, "PKG_DIRNAME", () => {
  return __shared__.module.safePath.dirname(filename)
})

export default ESM
