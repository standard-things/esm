// Based on `Module._resolveLookupPaths()`.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js

import GenericArray from "../../generic/array.js"
import RealModule from "../../real/module.js"

import _resolveLookupPaths from "../internal/resolve-lookup-paths.js"
import builtinLookup from "../../builtin-lookup.js"
import maskFunction from "../../util/mask-function.js"
import validateString from "../../util/validate-string.js"

const resolveLookupPaths = maskFunction(function (request, parent, newReturn = false) {
  validateString(request, "request")

  if (builtinLookup.has(request)) {
    return newReturn
      ? null
      : GenericArray.of(request, GenericArray.of())
  }

  const paths = _resolveLookupPaths(request, parent)

  return newReturn
    ? paths
    : GenericArray.of(request, paths)
}, RealModule._resolveLookupPaths)

export default resolveLookupPaths
