import binding from "../binding.js"
import isFile from "../util/is-file.js"
import isObjectLike from "../util/is-object-like.js"
import { readFileSync } from "fs"
import stripBOM from "../util/strip-bom.js"
import toNamespacedPath from "../path/to-namespaced-path.js"

const fsBinding = binding.fs
const { internalModuleReadFile } = fsBinding
let useReadFileFastPath = typeof internalModuleReadFile === "function"

function readFile(filePath, options) {
  const encoding = isObjectLike(options) ? options.encoding : options
  const isUTF8 = encoding === "utf8"

  if (useReadFileFastPath && isUTF8) {
    try {
      return fastPathReadFile(filePath)
    } catch (e) {
      useReadFileFastPath = false
    }
  }

  const content = fallbackReadFile(filePath, options)
  return isUTF8 && content !== null ? stripBOM(content) : content
}

function fallbackReadFile(filePath, options) {
  if (isFile(filePath)) {
    try {
      return readFileSync(filePath, options)
    } catch (e) {}
  }

  return null
}

function fastPathReadFile(filePath) {
  // Used to speed up reading. Returns the contents of the file as a string
  // or undefined when the file cannot be opened. The speedup comes from not
  // creating Error objects on failure.
  const content = internalModuleReadFile.call(fsBinding, toNamespacedPath(filePath))
  return content === void 0 ? null : content
}

export default readFile
