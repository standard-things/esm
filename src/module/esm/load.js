import { extname as _extname, dirname } from "path"

import Entry from "../../entry.js"

import _load from "../_load.js"
import extname from "../../path/extname.js"
import getQueryHash from "../../util/get-query-hash.js"
import getURLFromFilePath from "../../util/get-url-from-file-path.js"
import isESM from "../../util/is-es-module.js"
import isError from "../../util/is-error.js"
import moduleState from "../state.js"
import nodeModulePaths from "../node-module-paths.js"
import resolveFilename from "./resolve-filename.js"
import setGetter from "../../util/set-getter.js"

const extSym = Symbol.for("@std/esm:extensions")

function load(id, parent, isMain, options, preload) {
  const filePath = resolveFilename(id, parent, isMain, options)
  const queryHash = getQueryHash(id)
  const cacheId = filePath + queryHash
  const url = getURLFromFilePath(filePath) + queryHash

  let state

  if (! options.cjs) {
    isMain = false

    if (_extname(filePath) === ".mjs") {
      state = moduleState
    }
  }

  let child = state
    ? void 0
    : __non_webpack_require__.cache[cacheId]

  if (child &&
      isESM(child.exports) &&
      ! Entry.has(child.exports)) {
    delete __non_webpack_require__.cache[cacheId]
  }

  let error
  let called = false
  let threw = true

  try {
    child = _load(cacheId, parent, isMain, state, function () {
      called = true
      return loader.call(this, filePath, url, options, preload)
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
    error.message = error.message.replace("import", "@std/esm")
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

function loader(filePath, url, options, preload) {
  const mod = this
  const entry = Entry.get(mod)

  entry.url = url
  mod.filename = filePath
  mod.paths = nodeModulePaths(dirname(filePath))

  if (preload) {
    preload(mod)
  }

  let ext = extname(filePath)
  let { extensions } = moduleState

  if (ext === "" ||
      typeof extensions[ext] !== "function") {
    ext = ".js"
  }

  const { _extensions } = mod.constructor
  let extCompiler = extensions[ext]

  if (options.cjs &&
      (ext === ".js" || ext === ".mjs") &&
      typeof _extensions[ext] === "function" &&
      ! _extensions[ext][extSym]) {
    extensions = _extensions
    extCompiler = extensions[ext]
  }

  extCompiler.call(extensions, mod, filePath)
  mod.loaded = true
}

export default load
