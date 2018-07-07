import binding from "../binding.js"
import readFileSync from "./read-file-sync.js"
import shared from "../shared.js"
import toNamespacedPath from "../path/to-namespaced-path.js"

function init() {
  let useFastPath

  function readFile(filename, options) {
    if (typeof filename !== "string") {
      return null
    }

    if (useFastPath === void 0) {
      useFastPath = typeof binding.fs.internalModuleReadFile === "function"
    }

    if (useFastPath &&
        options === "utf8") {
      try {
        return readFileFastPath(filename)
      } catch (e) {
        useFastPath = false
      }
    }

    return readFileSync(filename, options)
  }

  function readFileFastPath(filename) {
    // Used to speed up reading. Returns the contents of the file as a string
    // or undefined when the file cannot be opened. The speedup comes from not
    // creating Error objects on failure.
    filename = toNamespacedPath(filename)

    // Warning: This internal method will crash if `filename` is a directory.
    // https://github.com/nodejs/node/issues/8307
    const content = binding.fs.internalModuleReadFile(filename)

    return content === void 0 ? null : content
  }

  return readFile
}

export default shared.inited
  ? shared.module.fsReadFile
  : shared.module.fsReadFile = init()
