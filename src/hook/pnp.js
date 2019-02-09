import ENV from "../constant/env.js"

import Module from "../module.js"

import { sep } from "../safe/path.js"

const {
  FLAGS
} = ENV

const YARN_PNP_FILENAME = ".pnp.js"

function hook(pnp) {
  const { _cache } = Module

  for (const name in _cache) {
    if (name.endsWith(sep + YARN_PNP_FILENAME)) {
      Reflect.deleteProperty(_cache, name)
      break
    }
  }

  for (const request of FLAGS.preloadModules) {
    if (request.endsWith(sep + YARN_PNP_FILENAME)) {
      Module._preloadModules([request])
      pnp._resolveFilename = Module._resolveFilename
      break
    }
  }
}

export default hook
