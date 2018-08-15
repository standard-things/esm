// Based on `Module#load()`.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js

import Entry from "../../entry.js"

import loader from "../cjs/loader.js"
import shared from "../../shared.js"

function load(filename) {
  if (this.loaded) {
    throw new shared.external.Error("Module already loaded: " + this.id)
  }

  const entry = Entry.get(this)
  const { parent } = this
  const parentEntry = parent && Entry.get(parent)

  loader(entry, filename, parentEntry)
}

export default load
