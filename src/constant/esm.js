import encodeId from "../util/encode-id.js"
import setDeferred from "../util/set-deferred.js"

// `process.env.PKG_VERSION` is replaced with the `esm` version at build time.
// https://webpack.js.org/plugins/environment-plugin/
const ESM = {
  __proto__: null,
  PKG_PREFIX: encodeId("esm"),
  PKG_VERSION: process.env.PKG_VERSION
}

const { filename } = __non_webpack_module__

setDeferred(ESM, "PKG_DIRNAME", () => {
  return __shared__.module.safePath.dirname(filename)
})

export default ESM
