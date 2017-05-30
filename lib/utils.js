"use strict"

const acorn = require("acorn")
const createHash = require("crypto").createHash
const esmSemVer = require("./version.js")
const data = require("./data.js")
const FastObject = require("./fast-object.js")
const fs = require("./fs.js")
const path = require("path")
const PkgInfo = require("./pkg-info.js")
const resolveFilename = require("module")._resolveFilename
const SemVer = require("semver")
const URL = require("url")

const codeOfA = "A".charCodeAt(0)
const codeOfZ = "Z".charCodeAt(0)
const dummyParser = new acorn.Parser
const esStrKey = "__esModule"
const esSymKey = Symbol.for(esStrKey)
const hasOwn = Object.prototype.hasOwnProperty
const maxSatisfyingCache = new FastObject

const DEFAULT_PKG_CONFIG = {
  "cache-directory": ".esm-cache",
  parser: void 0,
  sourceType: void 0
}

function getRange(json, name) {
  const entry = json[name]
  return isObject(entry) && hasOwn.call(entry, "@std/esm")
    ? SemVer.validRange(entry["@std/esm"])
    : null
}

function getCacheFileName(filePath, cacheKey, pkgInfo) {
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
    .update("\0")
    .digest("hex") + ext
}

exports.getCacheFileName = getCacheFileName

function getESModule(exported) {
  if (isObjectLike(exported)) {
    if (hasOwn.call(exported, esSymKey)) {
      return !! exported[esSymKey]
    }

    if (hasOwn.call(exported, esStrKey)) {
      return !! exported[esStrKey]
    }
  }

  return false
}

exports.getESModule = getESModule

function getNamesFromPattern(pattern) {
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

exports.getNamesFromPattern = getNamesFromPattern

function getPkgInfo(dirPath) {
  dirPath = toString(dirPath)
  if (dirPath in data.pkgInfo) {
    return data.pkgInfo[dirPath]
  }

  data.pkgInfo[dirPath] = null
  if (path.basename(dirPath) === "node_modules") {
    return null
  }

  const pkgInfo = readPkgInfo(dirPath)
  if (pkgInfo !== null) {
    return data.pkgInfo[dirPath] = pkgInfo
  }

  const parentPath = path.dirname(dirPath)
  if (parentPath !== dirPath) {
    const pkgInfo = getPkgInfo(parentPath)
    if (pkgInfo !== null) {
      return data.pkgInfo[dirPath] = pkgInfo
    }
  }

  return null
}

exports.getPkgInfo = getPkgInfo

function getRootModule(mod) {
  while (true) {
    if (mod.parent == null) {
      return mod
    }
    mod = mod.parent
  }
}

exports.getRootModule = getRootModule

function isCapitalized(string) {
  if (typeof string !== "string") {
    return false
  }
  const charCode = string.charCodeAt(0)
  return charCode >= codeOfA && charCode <= codeOfZ
}

exports.isCapitalized = isCapitalized

function isObject(value) {
  return typeof value === "object" && value !== null
}

exports.isObject = isObject

function isObjectLike(value) {
  const type = typeof value
  return type === "function" || (type === "object" && value !== null)
}

exports.isObjectLike = isObjectLike

function isNodeLike(value) {
  // Without a complete list of Node .type names, we have to settle for this
  // fuzzy matching of object shapes. However, the infeasibility of
  // maintaining a complete list of type names is one of the reasons we're
  // using the FastPath/Visitor abstraction in the first place.
  return isObject(value) &&
    ! Array.isArray(value) &&
    isCapitalized(value.type)
}

exports.isNodeLike = isNodeLike

function isREPL(mod) {
  if (mod.filename === null &&
      mod.id === "<repl>" &&
      mod.loaded === false &&
      mod.parent === void 0) {
    return true
  }
  return false
}

exports.isREPL = isREPL

function lookahead(parser) {
  dummyParser.input = parser.input
  dummyParser.pos = parser.pos
  dummyParser.nextToken()
  return dummyParser
}

exports.lookahead = lookahead

function maxSatisfying(versions, range) {
  const cacheKey = versions + "\0" + range
  if (cacheKey in maxSatisfyingCache) {
    return maxSatisfyingCache[cacheKey]
  }
  return maxSatisfyingCache[cacheKey] = SemVer.maxSatisfying(versions, range)
}

exports.maxSatisfying = maxSatisfying

function readPkgInfo(dirPath) {
  const pkgPath = path.join(dirPath, "package.json")
  const pkgJSON = fs.readJSON(pkgPath)

  if (pkgJSON === null) {
    return null
  }

  let config = pkgJSON["@std/esm"]

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

exports.readPkgInfo = readPkgInfo

function resolvePath(id, mod) {
  const parsed = URL.parse(id)
  if (typeof parsed.protocol !== "string") {
    return resolveFilename(id, mod)
  }
  // Based on file-uri-to-path.
  // Copyright Nathan Rajlich. Released under MIT license:
  // https://github.com/TooTallNate/file-uri-to-path
  if (parsed.protocol !== "file:" || parsed.pathname === null) {
    throw new TypeError
  }

  let host = parsed.host
  let pathname = unescape(parsed.pathname)
  let prefix = ""

  // Section 2: Syntax
  // https://tools.ietf.org/html/rfc8089#section-2
  if (host === "localhost") {
    host = ""
  } else if (host) {
    prefix += path.sep + path.sep
  } else if (pathname.startsWith("//")) {
    // Windows shares have a pathname starting with "//".
    prefix += path.sep
  }
  // Section E.2: DOS and Windows Drive Letters
  // https://tools.ietf.org/html/rfc8089#appendix-E.2
  // https://tools.ietf.org/html/rfc8089#appendix-E.2.2
  pathname = path.normalize(pathname.replace(/^\/([a-zA-Z])[:|]/, '$1:'))

  return resolveFilename(prefix + host + pathname, mod)
}

exports.resolvePath = resolvePath

function setESModule(exported) {
  if (isObjectLike(exported)) {
    exported[esSymKey] = true
  }
}

exports.setESModule = setESModule

function toString(value) {
  if (typeof value === "string") {
    return value
  }
  return value == null ? "" : String(value)
}

exports.toString = toString
