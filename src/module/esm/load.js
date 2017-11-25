import { extname as _extname, dirname } from "path"

import Entry from "../../entry.js"
import Module from "../../module.js"
import PkgInfo from "../../pkg-info.js"

import _load from "../_load.js"
import env from "../../env.js"
import extname from "../../path/extname.js"
import getQueryHash from "../../util/get-query-hash.js"
import getURLFromFilePath from "../../util/get-url-from-file-path.js"
import isESM from "../../util/is-es-module.js"
import isError from "../../util/is-error.js"
import moduleNodeModulePaths from "../node-module-paths.js"
import moduleResolveFilename from "../resolve-filename.js"
import moduleState from "../state.js"
import resolveFilename from "./resolve-filename.js"
import setGetter from "../../util/set-getter.js"
import toOptInError from "../../util/to-opt-in-error.js"

const BuiltinModule = __non_webpack_module__.constructor

function load(id, parent, isMain, preload) {
  const parentFilePath = (parent && parent.filename) || "."
  const parentPkgInfo = PkgInfo.get(dirname(parentFilePath))
  const parentOptions = parentPkgInfo && parentPkgInfo.options

  let filePath

  if (parentOptions && parentOptions.cjs.paths &&
      Module._resolveFilename !== moduleResolveFilename) {
    filePath = Module._resolveFilename(id, parent, isMain)
  } else {
    filePath = resolveFilename(id, parent, isMain)
  }

  const fromPath = dirname(filePath)
  const pkgInfo = PkgInfo.get(fromPath)
  const queryHash = getQueryHash(id)
  const cacheId = filePath + queryHash

  let state = __non_webpack_require__

  if (! (pkgInfo && pkgInfo.options.cjs.cache)) {
    isMain = false

    if (_extname(filePath) === ".mjs") {
      state = moduleState
    }
  }

  const isRequireState = state === __non_webpack_require__

  let child = isRequireState
    ? state.cache[cacheId]
    : null

  if (child &&
      isESM(child.exports) &&
      ! Entry.has(child)) {
    delete state.cache[cacheId]
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
    if (isRequireState) {
      delete state.cache[cacheId]
    } else {
      // Unlike CJS, ESM errors are preserved for subsequent loads.
      setGetter(state.cache, cacheId, () => {
        throw error
      })
    }
  }
}

function loader(filePath, fromPath, url, parentOptions, preload) {
  const mod = this
  mod.filename = filePath

  if (parentOptions && parentOptions.cjs.paths &&
      Module._nodeModulePaths !== moduleNodeModulePaths) {
    mod.paths = Module._nodeModulePaths(fromPath)
  } else {
    mod.paths = moduleNodeModulePaths(fromPath)
  }

  const entry = Entry.get(mod)
  entry.url = url

  if (preload) {
    preload(mod)
  }

  const Ctor = mod.constructor

  let { extensions } = moduleState
  let ext = extname(filePath)

  if (Ctor === BuiltinModule &&
      (ext === ".js" ||
        (parentOptions && parentOptions.cjs.extensions))) {
    extensions = Ctor._extensions
  }

  if (ext === "" ||
      typeof extensions[ext] !== "function") {
    ext = ".js"
  }

  if (env.cli) {
    extensions[ext](mod, filePath)
    mod.loaded = true
    return
  }

  extensions[ext](mod, filePath)
  mod.loaded = true
}

export default load
