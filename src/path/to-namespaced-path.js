import path from "path"

const toNamespacedPath = typeof path.toNamespacedPath === "function"
  ? path.toNamespacedPath
  : path._makeLong

export default toNamespacedPath
