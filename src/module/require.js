// Based on Node's `Module.prototype.require`.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js

import Module from "../module.js"

import _loadESM from "./esm/_load.js"
import errors from "../errors.js"
import isMJS from "../util/is-mjs.js"

const {
  ERR_INVALID_ARG_TYPE,
  ERR_INVALID_ARG_VALUE
} = errors

const req = function require(request) {
  if (typeof request !== "string") {
    throw new ERR_INVALID_ARG_TYPE("request", "string", request)
  }

  if (request === "") {
    throw new ERR_INVALID_ARG_VALUE("request",  request, "must be a non-empty string")
  }

  return isMJS(this)
    ? _loadESM(request, this, false).module.exports
    : Module._load(request, this, false)
}

export default req
