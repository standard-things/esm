import binding from "../binding.js"
import readFile from "./read-file.js"
import shared from "../shared.js"
import toNamespacedPath from "../path/to-namespaced-path.js"

function init() {
  let useFastPath
  let useInternalModuleReadJSON

  function readFileFast(filename, options) {
    if (typeof filename !== "string") {
      return null
    }

    if (useFastPath === void 0) {
      useInternalModuleReadJSON =
        typeof binding.fs.internalModuleReadJSON === "function"

      useFastPath =
        useInternalModuleReadJSON ||
        typeof binding.fs.internalModuleReadFile === "function"
    }

    if (useFastPath &&
        options === "utf8") {
      try {
        return readFileFastPath(filename, options)
      } catch {}

      useFastPath = false
    }

    return readFile(filename, options)
  }

  function readFileFastPath(filename, options) {
    let content

    if (typeof filename === "string") {
      // Used to speed up reading. Returns the contents of the file as a string
      // or undefined when the file cannot be opened. The speedup comes from not
      // creating Error objects on failure.
      filename = toNamespacedPath(filename)

      if (useInternalModuleReadJSON) {
        content = binding.fs.internalModuleReadJSON(filename)
      } else {
        // Warning: This internal method will crash if `filename` is a directory.
        // https://github.com/nodejs/node/issues/8307
        content = binding.fs.internalModuleReadFile(filename)
      }

      if (useInternalModuleReadJSON &&
          ! content) {
        return readFile(filename, options)
      }
    }

    return content === void 0 ? null : content
  }

  return readFileFast
}

export default shared.inited
  ? shared.module.fsReadFileFast
  : shared.module.fsReadFileFast = init()
