// Based on `Module#require()`.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js

import Entry from "../../entry.js"
import Module from "../../module.js"
import RealModule from "../../real/module.js"

import errors from "../../errors.js"
import esmLoad from "../esm/load.js"
import isExtMJS from "../../path/is-ext-mjs.js"
import maskFunction from "../../util/mask-function.js"
import shared from "../../shared.js"
import validateString from "../../util/validate-string.js"

const {
  ERR_INVALID_ARG_VALUE
} = errors

const RealProto = RealModule.prototype

const req = maskFunction(function (request) {
  validateString(request, "request")

  if (request === "") {
    throw new ERR_INVALID_ARG_VALUE("request",  request, "must be a non-empty string")
  }

  const { moduleState } = shared

  moduleState.requireDepth += 1

  try {
    const parentEntry = isExtMJS(this.filename)
      ? Entry.get(this)
      : null

    if (parentEntry !== null &&
        parentEntry._passthruRequire) {
      parentEntry._passthruRequire = false
      return esmLoad(request, this).module.exports
    }

    return Module._load(request, this)
  } finally {
    moduleState.requireDepth -= 1
  }
}, RealProto.require)

export default req
