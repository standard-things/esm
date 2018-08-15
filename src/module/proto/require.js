// Based on `Module#require()`.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js

import ENTRY from "../../constant/entry.js"

import Entry from "../../entry.js"
import Module from "../../module.js"

import errors from "../../errors.js"
import esmLoad from "../esm/load.js"
import isMJS from "../../path/is-mjs.js"

const {
  TYPE_ESM
} = ENTRY

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

  const parentEntry =
    isMJS(this.filename) &&
    Entry.get(this)

  if (parentEntry &&
      parentEntry._require === TYPE_ESM) {
    return esmLoad(request, this, false).module.exports
  }

  return Module._load(request, this, false)
}

export default req
