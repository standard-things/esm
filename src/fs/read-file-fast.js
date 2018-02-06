import binding from "../binding.js"
import readFileSync from "./read-file-sync.js"
import toNamespacedPath from "../path/to-namespaced-path.js"

const { internalModuleReadFile, internalModuleReadJSON } = binding.fs

const useInternalModuleReadJSON = typeof internalModuleReadJSON === "function"

let useReadFileFastPath =
  useInternalModuleReadJSON ||
  typeof internalModuleReadFile === "function"

function readFileFast(filename, options) {
  if (typeof filename !== "string") {
    return null
  }

  if (useReadFileFastPath &&
      options === "utf8") {
    try {
      return fastPathReadFile(filename, options)
    } catch (e) {
      useReadFileFastPath = false
    }
  }

  return readFileSync(filename, options)
}

function fastPathReadFile(filename, options) {
  // Used to speed up reading. Returns the contents of the file as a string
  // or undefined when the file cannot be opened. The speedup comes from not
  // creating Error objects on failure.
  filename = toNamespacedPath(filename)

  // Warning: These internal methods will crash if `filename` is a directory.
  // https://github.com/nodejs/node/issues/8307
  const content = useInternalModuleReadJSON
    ? internalModuleReadJSON(filename)
    : internalModuleReadFile(filename)

  if (useInternalModuleReadJSON &&
      ! content) {
    return readFileSync(filename, options)
  }

  return content === void 0 ? null : content
}

export default readFileFast
