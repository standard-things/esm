import safePath, { toNamespacedPath } from "../safe/path.js"

import shared from "../shared.js"

function init() {
  return typeof toNamespacedPath === "function"
    ? toNamespacedPath
    : safePath._makeLong
}

export default shared.inited
  ? shared.module.pathToNamespacedPath
  : shared.module.pathToNamespacedPath = init()
