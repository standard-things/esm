import ENV from "../constant/env.js"

import Module from "../module.js"

import { sep } from "../safe/path.js"

import escapeRegExp from "../util/escape-regexp.js"

const {
  FLAGS
} = ENV

const yarnPnpFilenameRegExp = new RegExp(`${escapeRegExp(sep)}\\.pnp\\.c?js$`)

function hook(pnp) {
  const { _cache } = Module

  for (const name in _cache) {
    if (yarnPnpFilenameRegExp.test(name)) {
      Reflect.deleteProperty(_cache, name)
      break
    }
  }

  for (const request of FLAGS.preloadModules) {
    if (yarnPnpFilenameRegExp.test(request)) {
      Module._preloadModules([request])
      pnp._resolveFilename = Module._resolveFilename
      break
    }
  }
}

export default hook
