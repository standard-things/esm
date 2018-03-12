import ESM from "../constant/esm.js"

import GenericArray from "../generic/array.js"

const {
  PKG_DIRNAME
} = ESM

function hasLoaderModule(modules) {
  if (! Array.isArray(modules)) {
    return false
  }

  return GenericArray.some(modules, ({ filename }) => {
    return typeof filename === "string" &&
      filename.startsWith(PKG_DIRNAME)
  })
}

export default hasLoaderModule
