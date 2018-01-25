import FastObject from "../fast-object.js"

import readFileFast from "../fs/read-file-fast.js"
import { readFileSync } from "fs"
import stripBOM from "../util/strip-bom.js"
import toNamespacedPath from "../path/to-namespaced-path.js"

const { dlopen } = process
const { parse } = JSON
const extensions = new FastObject

extensions[".js"] = (mod, filename) => {
  mod._compile(stripBOM(readFileSync(filename, "utf8")), filename)
}

extensions[".json"] = (mod, filename) => {
  const content = readFileFast(filename, "utf8")

  try {
    mod.exports = parse(content)
  } catch (error) {
    error.message = filename + ": " + error.message
    throw error
  }
}

extensions[".node"] = (mod, filename) => {
  return dlopen.call(process, mod, toNamespacedPath(filename))
}

export default extensions
