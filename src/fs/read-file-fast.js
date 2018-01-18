import binding from "../binding.js"
import noDeprecationWarning from "../warning/no-deprecation-warning.js"
import readFileSync from "./read-file-sync.js"
import toNamespacedPath from "../path/to-namespaced-path.js"

const fsBinding = binding.fs
const internalModuleReadFile = noDeprecationWarning(() => fsBinding.internalModuleReadFile)
const internalModuleReadJSON = noDeprecationWarning(() => fsBinding.internalModuleReadJSON)

const useInternalModuleReadFile = typeof internalModuleReadFile === "function"
const useInternalModuleReadJSON = typeof internalModuleReadJSON === "function"
let useReadFileFastPath = useInternalModuleReadFile || useInternalModuleReadJSON

function readFileFast(filePath, options) {
  if (typeof filePath !== "string") {
    return null
  }

  if (useReadFileFastPath &&
      options === "utf8") {
    try {
      return fastPathReadFile(filePath, options)
    } catch (e) {
      useReadFileFastPath = false
    }
  }

  return readFileSync(filePath, options)
}

function fastPathReadFile(filePath, options) {
  // Used to speed up reading. Returns the contents of the file as a string
  // or undefined when the file cannot be opened. The speedup comes from not
  // creating Error objects on failure.
  filePath = toNamespacedPath(filePath)

  const content = useInternalModuleReadJSON
    ? internalModuleReadJSON.call(fsBinding, filePath)
    : internalModuleReadFile.call(fsBinding, filePath)

  if (useInternalModuleReadJSON &&
      content === "") {
    return readFileSync(filePath, options)
  }

  return content === void 0 ? null : content
}

export default readFileFast
