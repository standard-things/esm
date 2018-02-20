import GenericArray from "../generic/array.js"

const stdFilename = __non_webpack_module__.filename

function hasLoaderModule(modules) {
  if (! Array.isArray(modules)) {
    return false
  }

  return GenericArray.some(modules, ({ filename }) => {
    return filename === stdFilename
  })
}

export default hasLoaderModule
