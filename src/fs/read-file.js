import binding from "../binding.js"
import isObjectLike from "../util/is-object-like.js"
import { readFileSync } from "fs"
import toNamespacedPath from "../path/to-namespaced-path.js"

const { internalModuleReadFile } = binding.fs
let useReadFileFastPath = typeof internalModuleReadFile === "function"

function readFile(filePath, options) {
  const encoding = isObjectLike(options) ? options.encoding : options

  if (useReadFileFastPath && encoding === "utf8") {
    try {
      return fastPathReadFile(filePath)
    } catch (e) {
      useReadFileFastPath = false
    }
  }
  return fallbackReadFile(filePath, options)
}

function fallbackReadFile(filePath, options) {
  try {
    return readFileSync(filePath, options)
  } catch (e) {}
  return null
}

function fastPathReadFile(filePath) {
  // Used to speed up reading. Returns the contents of the file as a string
  // or undefined when the file cannot be opened. The speedup comes from not
  // creating Error objects on failure.
  const content = internalModuleReadFile(toNamespacedPath(filePath))
  return content === void 0 ? null : content
}

export default readFile
