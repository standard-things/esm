import encodeId from "../util/encode-id.js"
import setDeferred from "../util/set-deferred.js"

// The `process.env` properties are replaced at build time.
// https://webpack.js.org/plugins/environment-plugin/
const ESM = {
  __proto__: null,
  PKG_DIRNAME: null,
  PKG_FILENAMES: null,
  PKG_PREFIX: encodeId("esm"),
  PKG_VERSION: process.env.PKG_VERSION
}

const { filename } = __non_webpack_module__

setDeferred(ESM, "PKG_DIRNAME", () => {
  const { safePath } = __shared__.module

  return safePath.dirname(filename)
})

setDeferred(ESM, "PKG_FILENAMES", function () {
  const { safePath } = __shared__.module
  const { sep } = safePath
  const { PKG_DIRNAME } = this
  const { PKG_FILENAMES } = process.env

  let { length } = PKG_FILENAMES

  while (length--) {
    PKG_FILENAMES[length] = PKG_DIRNAME + sep + PKG_FILENAMES[length]
  }

  return PKG_FILENAMES
})

export default ESM
