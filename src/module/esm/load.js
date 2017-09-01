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
      moduleState.cache[cacheId] ||
      __non_webpack_require__.cache[cacheId]

    if (child) {
      return child
    }

    // Backup existing cache entries because Node uses the child module's file
    // path, without query+hash, as its cache id.
    if (filePath in moduleState.cache) {
      oldChildA = moduleState.cache[filePath]
      delete moduleState.cache[filePath]
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
    moduleState.cache[cacheId] =
    __non_webpack_require__.cache[cacheId] = child

    if (oldChildA) {
      moduleState.cache[filePath] = oldChildA
    } else {
      delete moduleState.cache[filePath]
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
    setGetter(moduleState.cache, cacheId, () => {
      throw error
    })

    delete __non_webpack_require__.cache[cacheId]
  }
}

function loader(filePath) {
  let { extensions } = moduleState
  let ext = extname(filePath)
  const mod = this

  if (! ext || typeof extensions[ext] !== "function") {
    ext = ".js"
  }

  if (ext === ".js") {
    extensions = mod.constructor._extensions
  }

  const compiler = extensions[ext]

  if (typeof compiler === "function") {
    mod.filename = filePath
    mod.paths = nodeModulePaths(dirname(filePath))
    compiler.call(extensions, mod, filePath)
    mod.loaded = true
  } else {
    mod.load(filePath)
  }
}

export default load
