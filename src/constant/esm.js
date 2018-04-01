import encodeId from "../util/encode-id.js"
import setDeferred from "../util/set-deferred.js"
import shared from "../shared.js"

const { filename } = __non_webpack_module__

const ESM = {
  __proto__: null,
  PKG_PREFIX: encodeId("esm")
}

setDeferred(ESM, "PKG_DIRNAME", () => {
  return shared.module.safePath.dirname(filename)
})

export default ESM
