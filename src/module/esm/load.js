import { extname as _extname, dirname } from "path"

import Entry from "../../entry.js"

import _load from "../_load.js"
import extname from "../../path/extname.js"
import getQueryHash from "../../util/get-query-hash.js"
import getSourceType from "../../util/get-source-type.js"
import moduleState from "../state.js"
import nodeModulePaths from "../node-module-paths.js"
import resolveFilename from "./resolve-filename.js"
import setGetter from "../../util/set-getter.js"

function load(id, parent, isMain, options) {
  const filePath = resolveFilename(id, parent, isMain, options)
  const cacheId = filePath + getQueryHash(id)

  let child
  let state

  if (! (options && options.cjs) &&
      _extname(filePath) === ".mjs") {
    state = moduleState
  } else {
    child = __non_webpack_require__.cache[cacheId]

    if (child &&
        getSourceType(child.exports) === "module" &&
        ! Entry.has(child)) {
      delete __non_webpack_require__.cache[cacheId]
    }
  }

  let error
  let threw = true

  try {
    child = _load(cacheId, parent, isMain, state, function (cacheId) {
      return loader.call(this, cacheId, filePath)
    })

    threw = false
  } catch (e) {
    error = e
  }

  if (! threw) {
    return child
  }

  try {
    throw error
  } finally {
    // Unlike CJS, ESM errors are preserved for subsequent loads.
    setGetter(moduleState.cache, cacheId, () => {
      throw error
    })

    delete __non_webpack_require__.cache[cacheId]
  }
}

function loader(cacheId, filePath) {
  let ext = extname(filePath)
  const { extensions } = moduleState

  if (! ext || typeof extensions[ext] !== "function") {
    ext = ".js"
  }

  const extCompiler = extensions[ext]
  const mod = this

  if (typeof extCompiler !== "function") {
    mod.load(filePath)
    return
  }

  mod.filename = cacheId
  mod.paths = nodeModulePaths(dirname(filePath))

  extCompiler.call(extensions, mod, filePath)
  mod.loaded = true
}

export default load
