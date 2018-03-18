import { dirname } from "../safe/path.js"
import encodeId from "../util/encode-id.js"

const PKG_DIRNAME = dirname(__non_webpack_module__.filename)

let PKG_PARENT = __non_webpack_module__.parent
let seen = new Set

while (PKG_PARENT &&
    typeof PKG_PARENT.filename === "string" &&
    PKG_PARENT.filename.startsWith(PKG_DIRNAME) &&
    ! seen.has(PKG_PARENT)) {
  PKG_PARENT = PKG_PARENT.parent
  seen.add(PKG_PARENT)
}

seen = null

const ESM = {
  __proto__: null,
  PKG_DIRNAME,
  PKG_PARENT,
  PKG_PREFIX: encodeId("esm")
}

export default ESM
