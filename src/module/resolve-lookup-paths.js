// Based on Node's `Module._resolveLookupPaths` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/module.js

import { dirname, resolve } from "path"
import builtinModules from "../builtin-modules.js"
import moduleState from "./state.js"
import nodeModulePaths from "./node-module-paths.js"
import { satisfies } from "semver"

const codeOfDot = ".".charCodeAt(0)
const codeOfSlash = "/".charCodeAt(0)

const defaultOutsideDot = satisfies(process.version, ">=9")
const { slice } = Array.prototype

function resolveLookupPaths(id, parent, skipGlobalPaths, skipOutsideDot = defaultOutsideDot) {
  if (id in builtinModules) {
    return null
  }

  // Check for relative path.
  if ((! skipOutsideDot && id.length < 2) ||
      id.charCodeAt(0) !== codeOfDot ||
      (id.charCodeAt(1) !== codeOfDot &&
       id.charCodeAt(1) !== codeOfSlash)) {
    const parentPaths = parent && parent.paths
    const paths = parentPaths ? slice.call(parentPaths) : []

    // Maintain backwards compat with certain broken uses of `require(".")`
    // by putting the module"s directory in front of the lookup paths.
    if (! skipOutsideDot && id === ".") {
      const parentFilename = parent && parent.filename
      paths.unshift(parentFilename ? dirname(parentFilename) : resolve(id))
    }

    if (parentPaths && ! skipGlobalPaths) {
      paths.push(...moduleState.globalPaths)
    }

    return paths.length ? paths : null
  }

  // With --eval, `parent.id` is not set and `parent.filename` is `null`.
  if (! parent ||
      ! parent.id ||
      ! parent.filename) {
    // Normally the path is taken from `realpath(__filename)`
    // but with --eval there is no `__filename`.
    const paths = nodeModulePaths(".")
    paths.unshift(".")
    return paths
  }

  return [dirname(parent.filename)]
}

export default resolveLookupPaths
