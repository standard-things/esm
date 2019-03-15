import SafeJSON from "../../safe/json.js"

import { dlopen } from "../../safe/process.js"
import { readFileSync } from "../../safe/fs.js"
import stripBOM from "../../util/strip-bom.js"
import toNamespacedPath from "../../path/to-namespaced-path.js"

const extensions = { __proto__: null }

extensions[".js"] = function (mod, filename) {
  mod._compile(stripBOM(readFileSync(filename, "utf8")), filename)
}

extensions[".json"] = function (mod, filename) {
  const content = readFileSync(filename, "utf8")

  let exported

  try {
    exported = SafeJSON.parse(content)
  } catch (e) {
    e.message = filename + ": " + e.message

    throw e
  }

  mod.exports = exported
}

extensions[".node"] = function (mod, filename) {
  return dlopen(mod, toNamespacedPath(filename))
}

export default extensions
