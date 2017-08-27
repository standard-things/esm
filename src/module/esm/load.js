import _load from "../load.js"
import createOptions from "../../util/create-options.js"
import { dirname } from "path"
import extname from "../../path/extname.js"
import moduleState from "../state.js"
import nodeModulePaths from "../node-module-paths.js"
import resolveFilename from "./resolve-filename.js"
import setGetter from "../../util/set-getter.js"

const queryHashRegExp = /[?#].*$/

function load(id, parent, options) {
  options = createOptions(options)

  const state = parent ? parent.constructor : moduleState
  const filePath = resolveFilename(id, parent, options)

  let oldChild
  let cacheId = filePath
  let queryHash = queryHashRegExp.exec(id)

  if (queryHash !== null) {
    // Each id with a query+hash is given a new cache entry.
    cacheId = filePath + queryHash[0]

    if (cacheId in state._cache) {
      return state._cache[cacheId]
    }

    if (filePath in state._cache) {
      // Backup the existing module entry. The child module will be stored
      // there because Node sees the file path without the query+hash.
      oldChild = state._cache[filePath]
      delete state._cache[filePath]
    }
  }

  let error

  try {
    _load(filePath, parent, options.isMain, loader, () => filePath)
  } catch (e) {
    error = e
  }

  if (queryHash !== null) {
    state._cache[cacheId] = state._cache[filePath]

    if (oldChild) {
      state._cache[filePath] = oldChild
    } else {
      delete state._cache[filePath]
    }
  }

  if (error) {
    // Unlike CJS, ESM errors are preserved for subsequent loads.
    setGetter(state._cache, cacheId, () => {
      throw error
    })
  }

  return state._cache[cacheId]
}

function loader(filePath) {
  let { _extensions } = moduleState
  let ext = extname(filePath)
  const mod = this

  if (! ext || typeof _extensions[ext] !== "function") {
    ext = ".js"
  }

  if (ext === ".js") {
    _extensions = mod.constructor
  }

  const compiler = _extensions[ext]

  if (typeof compiler === "function") {
    mod.filename = filePath
    mod.paths = nodeModulePaths(dirname(filePath))
    compiler.call(_extensions, mod, filePath)
    mod.loaded = true
  } else {
    mod.load(filePath)
  }
}

export default load
