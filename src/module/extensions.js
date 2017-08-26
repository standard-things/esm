import FastObject from "../fast-object.js"

import assign from "../util/assign.js"
import fs from "fs"
import stripBOM from "../util/strip-bom.js"
import toNamespacedPath from "../path/to-namespaced-path.js"

const { dlopen } = process
const { parse:jsonParse } = JSON

const BuiltinModule = __non_webpack_module__.constructor
const extensions = assign(new FastObject, BuiltinModule._extensions)

extensions[".js"] = function (mod, filePath) {
  const content = fs.readFileSync(filePath, "utf8")
  mod._compile(stripBOM(content), filePath)
}

extensions[".json"] = function (mod, filePath) {
  const content = fs.readFileSync(filePath, "utf8")

  try {
    mod.exports = jsonParse(stripBOM(content))
  } catch (error) {
    error.message = filePath + ": " + error.message
    throw error
  }
}

extensions[".node"] = function (mod, filePath) {
  return dlopen(mod, toNamespacedPath(filePath))
}

export default extensions
