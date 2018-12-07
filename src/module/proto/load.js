// Based on `Module#load()`.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js

import Entry from "../../entry.js"
import RealModule from "../../real/module.js"

import loader from "../cjs/loader.js"
import maskFunction from "../../util/mask-function.js"
import shared from "../../shared.js"

const RealProto = RealModule.prototype

const load = maskFunction(function (filename) {
  if (this.loaded) {
    throw new shared.external.Error("Module already loaded: " + this.id)
  }

  const entry = Entry.get(this)
  const parentEntry = Entry.get(this.parent)

  loader(entry, filename, parentEntry)
}, RealProto.load)

export default load
