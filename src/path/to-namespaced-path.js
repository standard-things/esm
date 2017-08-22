import { _makeLong, toNamespacedPath as _toNamespacedPath } from "path"

const toNamespacedPath = typeof _toNamespacedPath === "function"
  ? _toNamespacedPath
  : _makeLong

export default toNamespacedPath
