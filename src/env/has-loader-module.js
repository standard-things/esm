import SafeArray from "../builtin/array.js"

const stdFilename = __non_webpack_module__.filename

function hasLoaderModule(modules) {
  return SafeArray.isArray(modules) &&
    modules.some(({ filename }) => filename === stdFilename)
}

export default hasLoaderModule
