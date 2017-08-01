import FastObject from "../fast-object.js"
import Module from "module"
import URL from "url"

import builtinModules from "../builtin-modules.js"
import isPath from "./is-path.js"
import path from "path"

const nodeModulePaths = Module._nodeModulePaths
const resolveCache = new FastObject
const resolveFilename = Module._resolveFilename
const urlCharsRegExp = /[:?#%]/

function resolveId(id, parent) {
  if (! id ||
      typeof id !== "string" ||
      id in builtinModules ||
      (! urlCharsRegExp.test(id) && isPath(id))) {
    return id
  }

  const filename = parent.filename === null ? "." : parent.filename
  const cacheKey = id + "\0" + filename

  if (cacheKey in resolveCache) {
    return resolveCache[cacheKey]
  }

  const parsed = URL.parse(id)

  if (typeof parsed.pathname === "string") {
    id = decodeURI(parsed.pathname)
  }

  if (typeof parsed.protocol !== "string") {
    // Prevent resolving non-local dependencies:
    // https://github.com/bmeck/node-eps/blob/rewrite-esm/002-es-modules.md#432-removal-of-non-local-dependencies
    const paths = nodeModulePaths(path.dirname(filename))

    // Overwrite concat() to prevent global paths from being concatenated.
    paths.concat = () => paths

    // Ensure a parent id and filename are provided to avoid going down the
    // --eval branch of Module._resolveLookupPaths().
    return resolveCache[cacheKey] = resolveFilename(id, { filename, id: "<mock>", paths })
  }

  if (! parsed.pathname ||
      parsed.protocol !== "file:") {
    const error = new Error("Cannot find module '" + id + "'")
    error.code = "MODULE_NOT_FOUND"
    throw error
  }

  // Based on file-uri-to-path.
  // Copyright Nathan Rajlich. Released under MIT license:
  // https://github.com/TooTallNate/file-uri-to-path
  let host = parsed.host
  let pathname = id
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
  pathname = path.normalize(pathname.replace(/^\/([a-zA-Z])[:|]/, "$1:"))

  return resolveCache[cacheKey] = resolveFilename(prefix + host + pathname, parent)
}

export default resolveId
