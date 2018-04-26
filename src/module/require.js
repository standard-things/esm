// Based on Node's `Module.prototype.require`.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js

import Module from "../module.js"

import errors from "../errors.js"

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

  return Module._load(request, this, false)
}

export default req
