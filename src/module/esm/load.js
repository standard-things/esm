import { extname as _extname, dirname } from "path"

import Entry from "../../entry.js"
import Module from "../../module.js"
import PkgInfo from "../../pkg-info.js"

import _load from "../_load.js"
import _resolveFilename from "./_resolve-filename.js"
import extname from "../../path/extname.js"
import getQueryHash from "../../util/get-query-hash.js"
import getURLFromFilePath from "../../util/get-url-from-file-path.js"
import isESM from "../../util/is-es-module.js"
import isError from "../../util/is-error.js"
import moduleNodeModulePaths from "../node-module-paths.js"
import moduleResolveFilename from "../cjs/resolve-filename.js"
import moduleState from "../state.js"
import setGetter from "../../util/set-getter.js"
import toOptInError from "../../util/to-opt-in-error.js"

function load(id, parent, isMain, preload) {
  const parentEntry = Entry.get(parent)
  const parentSpecifiers = parentEntry && parentEntry.specifiers

  const parentPkgInfo = PkgInfo.from(parent)
  const parentOptions = parentPkgInfo && parentPkgInfo.options

  let filePath

  if (parentSpecifiers &&
      id in parentSpecifiers) {
    filePath = parentSpecifiers[id]
  } else if (Module._resolveFilename !== moduleResolveFilename &&
      parentOptions && parentOptions.cjs.paths) {
    filePath = Module._resolveFilename(id, parent, isMain)
  } else {
    filePath = _resolveFilename(id, parent, isMain)
  }

  const fromPath = dirname(filePath)
  const pkgInfo = PkgInfo.get(fromPath)
  const queryHash = getQueryHash(id)
  const cacheId = filePath + queryHash

  let state = Module

  if (! (pkgInfo && pkgInfo.options.cjs.cache)) {
    isMain = false

    if (_extname(filePath) === ".mjs") {
      state = moduleState
    }
  }

  const isModState = state === Module

  let child = isModState
    ? state._cache[cacheId]
    : null

  if (child &&
      isESM(child.exports) &&
      ! Entry.has(child)) {
    delete state._cache[cacheId]
  }

  let error
  let called = false
  let threw = true

  try {
    child = _load(cacheId, parent, isMain, state, function () {
      called = true
      const url = getURLFromFilePath(filePath) + queryHash
      return loader.call(this, filePath, fromPath, url, parentOptions, preload)
    })

    if (! called &&
        preload) {
      called = true
      preload(child)
    }

    threw = false
  } catch (e) {
    error = e
  }

  if (! threw) {
    return child
  } else if (isError(error) &&
      error.code === "ERR_REQUIRE_ESM") {
    toOptInError(error)
  }

  try {
    throw error
  } finally {
    if (isModState) {
      delete state._cache[cacheId]
    } else {
      // Unlike CJS, ESM errors are preserved for subsequent loads.
      setGetter(state._cache, cacheId, () => {
        throw error
      })
    }
  }
}

function loader(filePath, fromPath, url, parentOptions, preload) {
  const mod = this
  mod.filename = filePath

  if (Module._nodeModulePaths !== moduleNodeModulePaths &&
      parentOptions && parentOptions.cjs.paths) {
    mod.paths = Module._nodeModulePaths(fromPath)
  } else {
    mod.paths = moduleNodeModulePaths(fromPath)
  }

  const entry = Entry.get(mod)
  entry.url = url

  if (preload) {
    preload(mod)
  }

  let { _extensions } = moduleState
  let ext = extname(filePath)

  if (ext === ".js" ||
      (parentOptions && parentOptions.cjs.extensions)) {
    _extensions = Module._extensions
  }

  if (ext === "" ||
      typeof _extensions[ext] !== "function") {
    ext = ".js"
  }

  _extensions[ext](mod, filePath)
  mod.loaded = true
}

export default load
