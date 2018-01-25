const { isArray } = Array

const stdFilename = __non_webpack_module__.filename

function hasLoaderModule(modules) {
  return isArray(modules) &&
    modules.some(({ filename }) => filename === stdFilename)
}

export default hasLoaderModule
