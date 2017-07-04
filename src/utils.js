import { Parser as AcornParser } from "acorn/dist/acorn.es.js"
import crypto from "crypto"
import data from "./data.js"
import esmSemVer from "./version.js"
import FastObject from "./fast-object.js"
import fs from "./fs.js"
import path from "path"
import PkgInfo from "./pkg-info.js"
import SemVer from "semver"

const acornParser = new AcornParser
const acornRaise = acornParser.raise
const defineGetter = Object.prototype.__defineGetter__
const defineSetter = Object.prototype.__defineSetter__
const esStrKey = "__esModule"
const esSymKey = Symbol.for(esStrKey)
const hasOwn = Object.prototype.hasOwnProperty
const lookupGetter = Object.prototype.__lookupGetter__
const lookupSetter = Object.prototype.__lookupSetter__

class Utils {
  static encodeIdent(identifier) {
    return identifier + "\u200d"
  }

  static getCacheFileName(filePath, cacheKey, pkgInfo) {
    // While MD5 is not suitable for verification of untrusted data,
    // it is great for revving files. See Sufian Rhazi's post for more details
    // https://blog.risingstack.com/automatic-cache-busting-for-your-css/.
    const hash1 = Utils.md5(filePath)
    const hash2 = Utils.md5(
      esmSemVer.version + "\0" +
      JSON.stringify(pkgInfo.options) + "\0" +
      cacheKey
    )

    const extname = typeof filePath === "string"
      ? path.extname(filePath)
      : ".js"

    return hash1.slice(0, 8) + hash2.slice(0, 8) + extname
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
    dirPath = Utils.toString(dirPath)
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

  static md5(value) {
    return crypto
      .createHash("md5")
      .update(Utils.toString(value))
      .digest("hex")
  }

  static parserLookahead(parser) {
    acornParser.input = parser.input
    acornParser.pos = parser.pos
    acornParser.nextToken()
    return acornParser
  }

  static parserRaise(parser) {
    try {
      acornRaise.call(parser, parser.start, "Unexpected token")
    } catch (e) {
      e.reparse = false
      throw e
    }
  }

  static readPkgInfo(dirPath) {
    const pkgPath = path.join(dirPath, "package.json")
    const pkgJSON = fs.readJSON(pkgPath)

    if (pkgJSON === null) {
      return null
    }

    let options
    if (Utils.has(pkgJSON, "@std/esm")) {
      options = pkgJSON["@std/esm"]
    } else if (Utils.has(pkgJSON, "@std") && Utils.has(pkgJSON["@std"], "esm")) {
      options = pkgJSON["@std"].esm
    }

    if (options === false) {
      // An explicit "@std/esm": false property in package.json disables esm
      // loading even if "@std/esm" is listed as a dependency.
      return null
    }
    // Use case: a package.json file may have "@std/esm" in its "devDependencies"
    // object because it expects another package or application to enable esm
    // loading in production, but needs its own copy of the "@std/esm" package
    // during development. Disabling esm loading in production when it was
    // enabled in development would be undesired in this case.
    const range =
      getRange(pkgJSON, "dependencies") ||
      getRange(pkgJSON, "peerDependencies") ||
      getRange(pkgJSON, "devDependencies")

    if (range === null) {
      return null
    }

    return new PkgInfo(dirPath, range, options)
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

  static toString(value) {
    if (typeof value === "string") {
      return value
    }
    return value == null ? "" : String(value)
  }

  static wrap(func, wrapper) {
    return function() {
      let i = 0
      const argCount = arguments.length + 1
      const args = new Array(argCount)

      while (++i < argCount) {
        args[i] = arguments[i - 1]
      }

      args[0] = func
      return wrapper.apply(this, args)
    }
  }
}

function getRange(json, name) {
  const entry = json[name]
  return Utils.has(entry, "@std/esm")
    ? SemVer.validRange(entry["@std/esm"])
    : null
}

Object.setPrototypeOf(Utils.prototype, null)

export default Utils
