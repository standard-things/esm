import FastObject from "../fast-object.js"

import assign from "../util/assign.js"
import fs from "fs"
import readFile from "../fs/read-file.js"
import stripBOM from "../util/strip-bom.js"
import toNamespacedPath from "../path/to-namespaced-path.js"

const BuiltinModule = __non_webpack_module__.constructor

const { dlopen } = process
const { parse } = JSON
const extensions = assign(new FastObject, BuiltinModule._extensions)

extensions[".js"] = function (mod, filePath) {
  const content = fs.readFileSync(filePath, "utf8")
  mod._compile(stripBOM(content), filePath)
}

extensions[".json"] = function (mod, filePath) {
  const content = readFile(filePath, "utf8")

  try {
    mod.exports = parse(content)
  } catch (error) {
    error.message = filePath + ": " + error.message
    throw error
  }
}

extensions[".node"] = function (mod, filePath) {
  return dlopen(mod, toNamespacedPath(filePath))
}

export default extensions
