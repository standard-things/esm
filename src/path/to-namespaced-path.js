import { _makeLong, toNamespacedPath } from "../safe/path.js"

import shared from "../shared.js"

function init() {
  return typeof toNamespacedPath === "function"
    ? toNamespacedPath
    : _makeLong
}

export default shared.inited
  ? shared.module.pathToNamespacedPath
  : shared.module.pathToNamespacedPath = init()
