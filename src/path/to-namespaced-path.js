import safePath from "../safe/path.js"
import shared from "../shared.js"

function init() {
  return typeof safePath.toNamespacedPath === "function"
    ? safePath.toNamespacedPath
    : safePath._makeLong
}

export default shared.inited
  ? shared.module.pathToNamespacedPath
  : shared.module.pathToNamespacedPath = init()
