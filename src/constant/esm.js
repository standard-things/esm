import encodeId from "../util/encode-id.js"
import setDeferred from "../util/set-deferred.js"
import shared from "../shared.js"

const { filename, parent } = __non_webpack_module__

const ESM = {
  __proto__: null,
  PKG_PREFIX: encodeId("esm")
}

setDeferred(ESM, "PKG_DIRNAME", () => {
  return shared.module.safePath.dirname(filename)
})

setDeferred(ESM, "PKG_PARENT", () => {
  const { PKG_DIRNAME } = ESM
  const seen = new Set

  let PKG_PARENT = parent

  while (PKG_PARENT &&
      typeof PKG_PARENT.filename === "string" &&
      PKG_PARENT.filename.startsWith(PKG_DIRNAME) &&
      ! seen.has(PKG_PARENT)) {
    PKG_PARENT = PKG_PARENT.parent
    seen.add(PKG_PARENT)
  }

  return PKG_PARENT
})

export default ESM
