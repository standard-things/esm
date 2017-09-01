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
  const filePath = resolveFilename(id, parent, options)

  let child
  let oldChildA
  let oldChildB
  let cacheId = filePath
  let queryHash = queryHashRegExp.exec(id)

  if (queryHash !== null) {
    // Each id with a query+hash is given a new cache entry.
    cacheId = filePath + queryHash[0]

    child =
      moduleState._cache[cacheId] ||
      __non_webpack_require__.cache[cacheId]

    if (child) {
      return child
    }

    // Backup existing cache entries because Node uses the child module's file
    // path, without query+hash, as its cache id.
    if (filePath in moduleState._cache) {
      oldChildA = moduleState._cache[filePath]
      delete moduleState._cache[filePath]
    }

    if (filePath in __non_webpack_require__.cache) {
      oldChildB = __non_webpack_require__.cache[filePath]
      delete __non_webpack_require__.cache[filePath]
    }
  }

  let error
  let threw = true

  try {
    child = _load(filePath, parent, options.isMain, loader, () => filePath)
    threw = false
  } catch (e) {
    error = e
  }

  if (queryHash !== null) {
    moduleState._cache[cacheId] =
    __non_webpack_require__.cache[cacheId] = child

    if (oldChildA) {
      moduleState._cache[filePath] = oldChildA
    } else {
      delete moduleState._cache[filePath]
    }

    if (oldChildB) {
      __non_webpack_require__.cache[filePath] = oldChildB
    } else {
      delete __non_webpack_require__.cache[filePath]
    }
  }

  if (! threw) {
    return child
  }

  try {
    throw error
  } finally {
    // Unlike CJS, ESM errors are preserved for subsequent loads.
    setGetter(moduleState._cache, cacheId, () => {
      throw error
    })

    delete __non_webpack_require__.cache[cacheId]
  }
}

function loader(filePath) {
  let { _extensions } = moduleState
  let ext = extname(filePath)
  const mod = this

  if (! ext || typeof _extensions[ext] !== "function") {
    ext = ".js"
  }

  if (ext === ".js") {
    ({ _extensions } = mod.constructor)
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
