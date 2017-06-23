"use strict"

const acorn = require("acorn")
const createHash = require("crypto").createHash
const esmSemVer = require("./version.js")
const data = require("./data.js")
const FastObject = require("./fast-object.js")
const fs = require("./fs.js")
const path = require("path")
const PkgInfo = require("./pkg-info.js")
const SemVer = require("semver")

const defineGetter = Object.prototype.__defineGetter__
const defineSetter = Object.prototype.__defineSetter__
const dummyParser = new acorn.Parser
const esStrKey = "__esModule"
const esSymKey = Symbol.for(esStrKey)
const hasOwn = Object.prototype.hasOwnProperty
const lookupGetter = Object.prototype.__lookupGetter__
const lookupSetter = Object.prototype.__lookupSetter__

const DEFAULT_PKG_CONFIG = {
  "cache-directory": ".esm-cache",
  parser: void 0,
  sourceType: void 0
}

class Utils {
  static encodeIdent(identifier) {
    return identifier.split("").join("\u200d")
  }

  static getCacheFileName(filePath, cacheKey, pkgInfo) {
    const ext = typeof filePath === "string" ? path.extname(filePath) : ".js"

    // Take only the major and minor components of the @std/esm version, so that
    // we don't invalidate the cache every time a patch version is released.
    return createHash("sha1")
      .update(esmSemVer.major + "." + esmSemVer.minor)
      .update("\0")
      .update(toString(filePath))
      .update("\0")
      .update(toString(cacheKey))
      .update("\0")
      .update(JSON.stringify(pkgInfo.config))
      .digest("hex") + ext
  }

  static getGetter(object, key) {
    return Utils.has(object, key) ? lookupGetter.call(object, key) : void 0
  }

  static getNamesFromPattern(pattern) {
    let i = -1
    const names = []
    const queue = [pattern]

    while (++i < queue.length) {
      const pattern = queue[i]
      if (pattern === null) {
        // The ArrayPattern .elements array can contain null to indicate that
        // the position is a hole.
        continue
      }

      // Cases are ordered from most to least likely to encounter.
      switch (pattern.type) {
      case "Identifier":
        names.push(pattern.name)
        break
      case "Property":
      case "ObjectProperty":
        queue.push(pattern.value)
        break
      case "AssignmentPattern":
        queue.push(pattern.left)
        break
      case "ObjectPattern":
        queue.push.apply(queue, pattern.properties)
        break
      case "ArrayPattern":
        queue.push.apply(queue, pattern.elements)
        break
      case "RestElement":
        queue.push(pattern.argument)
        break
      }
    }

    return names
  }

  static getPkgInfo(dirPath) {
    dirPath = toString(dirPath)
    if (dirPath in data.pkgInfo) {
      return data.pkgInfo[dirPath]
    }

    data.pkgInfo[dirPath] = null
    if (path.basename(dirPath) === "node_modules") {
      return null
    }

    const pkgInfo = Utils.readPkgInfo(dirPath)
    if (pkgInfo !== null) {
      return data.pkgInfo[dirPath] = pkgInfo
    }

    const parentPath = path.dirname(dirPath)
    if (parentPath !== dirPath) {
      const pkgInfo = Utils.getPkgInfo(parentPath)
      if (pkgInfo !== null) {
        return data.pkgInfo[dirPath] = pkgInfo
      }
    }

    return null
  }

  static getSetter(object, key) {
    return Utils.has(object, key) ? lookupSetter.call(object, key) : void 0
  }

  static has(object, key) {
    return object != null && hasOwn.call(object, key)
  }

  static isESModule(exported) {
    return Utils.isObjectLike(exported) &&
      hasOwn.call(exported, esSymKey) && !! exported[esSymKey]
  }

  static isESModuleLike(exported) {
    return Utils.isObjectLike(exported) &&
      ((hasOwn.call(exported, esSymKey) && !! exported[esSymKey]) ||
        (hasOwn.call(exported, esStrKey) && !! exported[esStrKey]))
  }

  static isObject(value) {
    return typeof value === "object" && value !== null
  }

  static isObjectLike(value) {
    const type = typeof value
    return type === "function" || (type === "object" && value !== null)
  }

  static lookahead(parser) {
    dummyParser.input = parser.input
    dummyParser.pos = parser.pos
    dummyParser.nextToken()
    return dummyParser
  }

  static readPkgInfo(dirPath) {
    const pkgPath = path.join(dirPath, "package.json")
    const pkgJSON = fs.readJSON(pkgPath)

    if (pkgJSON === null) {
      return null
    }

    let config
    if (Utils.has(pkgJSON, "@std/esm")) {
      config = pkgJSON["@std/esm"]
    } else if (Utils.has(pkgJSON, "@std") && Utils.has(pkgJSON["@std"], "esm")) {
      config = pkgJSON["@std"].esm
    }

    if (config === false) {
      // An explicit "@std/esm": false property in package.json disables
      // reification even if "@std/esm" is listed as a dependency.
      return null
    }

    const range =
      getRange(pkgJSON, "dependencies") ||
      getRange(pkgJSON, "peerDependencies") ||
      getRange(pkgJSON, "devDependencies")

    // Use case: a package.json file may have "@std/esm" in its "devDependencies"
    // object because it expects another package or application to enable
    // reification in production, but needs its own copy of the "@std/esm" package
    // during development. Disabling reification in production when it was enabled
    // in development would be undesired in this case.
    if (range === null) {
      return null
    }

    config = Object.assign(Object.create(null), DEFAULT_PKG_CONFIG, config)

    const cacheDir = config["cache-directory"]
    const cachePath = typeof cacheDir === "string" ? path.join(dirPath, cacheDir) : null
    const cacheFiles = cachePath === null ? null : fs.readdir(cachePath)

    const pkgInfo = new PkgInfo
    pkgInfo.cachePath = cachePath
    pkgInfo.config = config
    pkgInfo.path = dirPath
    pkgInfo.range = range

    let fileCount = cacheFiles === null ? 0 : cacheFiles.length

    while (fileCount--) {
      // Later, in Module._extensions[".js"], we'll change the value to the actual
      // contents of the file, but for now we merely register that it exists.
      pkgInfo.cache[cacheFiles[fileCount]] = true
    }

    return pkgInfo
  }

  static setESModule(exported) {
    exported[esSymKey] = true
  }

  static setGetter(object, key, getter) {
    defineGetter.call(object, key, getter)
  }

  static setSetter(object, key, setter) {
    defineSetter.call(object, key, setter)
  }
}

function getRange(json, name) {
  const entry = json[name]
  return Utils.has(entry, "@std/esm")
    ? SemVer.validRange(entry["@std/esm"])
    : null
}

function toString(value) {
  if (typeof value === "string") {
    return value
  }
  return value == null ? "" : String(value)
}

Object.setPrototypeOf(Utils.prototype, null)

module.exports = Utils
