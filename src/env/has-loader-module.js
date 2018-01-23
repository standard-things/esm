const { isArray } = Array

const stdPath = __non_webpack_module__.filename

function hasLoaderModule(modules) {
  return isArray(modules) &&
    modules.some(({ filename }) => filename === stdPath)
}

export default hasLoaderModule
