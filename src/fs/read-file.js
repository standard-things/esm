import binding from "../binding/fs.js"
import fs from "fs"

const internalModuleReadFile = binding.internalModuleReadFile
let useReadFileFastPath = typeof internalModuleReadFile === "function"

function readFile(filePath, options) {
  const encoding = typeof options === "object" && options !== null
    ? options.encoding
    : options

  if (useReadFileFastPath && encoding === "utf8") {
    try {
      // Used to speed up reading. Returns the contents of the file as a string
      // or undefined when the file cannot be opened. The speedup comes from not
      // creating Error objects on failure.
      const content = internalModuleReadFile(filePath)
      return content === void 0 ? null : content
    } catch (e) {
      useReadFileFastPath = false
    }
  }
  return fallbackReadFile(filePath, options)
}

function fallbackReadFile(filePath, options) {
  try {
    return fs.readFileSync(filePath, options)
  } catch (e) {}
  return null
}

export default readFile
