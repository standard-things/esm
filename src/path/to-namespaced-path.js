import path from "path"
import shared from "../shared.js"

function init() {
  return typeof path.toNamespacedPath === "function"
    ? path.toNamespacedPath
    : path._makeLong
}

export default shared.inited
  ? shared.module.pathToNamespacedPath
  : shared.module.pathToNamespacedPath = init()
