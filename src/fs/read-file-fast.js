import binding from "../binding.js"
import readFileSync from "./read-file-sync.js"
import shared from "../shared.js"
import toNamespacedPath from "../path/to-namespaced-path.js"

function readFileFast(filename, options) {
  if (typeof filename !== "string") {
    return null
  }

  const { fastPath } = shared

  if (fastPath.readFileFast &&
      options === "utf8") {
    try {
      return fastPathReadFile(filename, options)
    } catch (e) {
      fastPath.readFileFast = false
    }
  }

  return readFileSync(filename, options)
}

function fastPathReadFile(filename, options) {
  // Used to speed up reading. Returns the contents of the file as a string
  // or undefined when the file cannot be opened. The speedup comes from not
  // creating Error objects on failure.
  filename = toNamespacedPath(filename)

  const useInternalModuleReadJSON = shared.support.internalModuleReadJSON

  // Warning: These internal methods will crash if `filename` is a directory.
  // https://github.com/nodejs/node/issues/8307
  const content = useInternalModuleReadJSON
    ? binding.fs.internalModuleReadJSON(filename)
    : binding.fs.internalModuleReadFile(filename)

  if (useInternalModuleReadJSON &&
      ! content) {
    return readFileSync(filename, options)
  }

  return content === void 0 ? null : content
}

export default readFileFast
