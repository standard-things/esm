import { extname as _extname, dirname } from "path"

import Entry from "../../entry.js"
import PkgInfo from "../../pkg-info.js"

import _load from "../_load.js"
import env from "../../env.js"
import extname from "../../path/extname.js"
import getQueryHash from "../../util/get-query-hash.js"
import getURLFromFilePath from "../../util/get-url-from-file-path.js"
import has from "../../util/has.js"
import isESM from "../../util/is-es-module.js"
import isError from "../../util/is-error.js"
import moduleState from "../state.js"
import nodeModulePaths from "../node-module-paths.js"
import resolveFilename from "./resolve-filename.js"
import setGetter from "../../util/set-getter.js"

const BuiltinModule = __non_webpack_module__.constructor

const compileSym = Symbol.for("@std/esm:module._compile")

function load(id, parent, isMain, preload) {
  const filePath = resolveFilename(id, parent, isMain)
  const pkgInfo = PkgInfo.get(dirname(filePath))
  const queryHash = getQueryHash(id)
  const cacheId = filePath + queryHash
  const options = pkgInfo ? pkgInfo.options : null
  const url = getURLFromFilePath(filePath) + queryHash

  let state = __non_webpack_require__

  if (! (options && options.cjs.cache)) {
    isMain = false

    if (_extname(filePath) === ".mjs") {
      state = moduleState
    }
  }

  let isRequireState = state === __non_webpack_require__

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
      return loader.call(this, filePath, url, parent, preload)
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

function loader(filePath, url, parent, preload) {
  const mod = this
  const entry = Entry.get(mod)

  entry.url = url
  mod.filename = filePath
  mod.paths = nodeModulePaths(dirname(filePath))

  if (preload) {
    preload(mod)
  }

  const Ctor = mod.constructor
  const filename = parent && typeof parent.filename === "string"
    ? parent.filename
    : "."

  const pkgInfo = PkgInfo.get(dirname(filename))
  const options = pkgInfo ? pkgInfo.options : null

  let { extensions } = moduleState
  let ext = extname(filePath)

  if (Ctor === BuiltinModule &&
      ((options && options.cjs.extensions) || ext === ".js")) {
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

  const { _compile } = mod
  const shouldRestore = has(mod, "_compile")

  mod._compile = (content, filePath) => {
    if (shouldRestore) {
      mod._compile = _compile
    } else {
      delete mod._compile
    }

    const func = typeof mod[compileSym] === "function"
      ? mod[compileSym]
      : _compile

    return func.call(mod, content, filePath)
  }

  extensions[ext](mod, filePath)
  mod.loaded = true
}

export default load
