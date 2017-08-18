import FastObject from "./fast-object.js"

import { _makeLong } from "path"
import readFile from "./fs/read-file.js"

const { dlopen } = process
const { parse:jsonParse } = JSON

const builtinCompilers = new FastObject

builtinCompilers[".json"] = function (mod, filePath) {
  const content = readFile(filePath, "utf8")

  try {
    mod.exports = jsonParse(content)
  } catch (error) {
    error.message = filePath + ": " + error.message
    throw error
  }
}

builtinCompilers[".node"] = function (mod, filePath) {
  return dlopen(mod, _makeLong(filePath))
}

export default builtinCompilers
