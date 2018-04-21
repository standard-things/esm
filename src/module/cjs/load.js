// Based on Node's `Module._load`.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js

import { dirname, extname } from "../../safe/path.js"

import ENTRY from "../../constant/entry.js"
import PACKAGE from "../../constant/package.js"

import Entry from "../../entry.js"
import Module from "../../module.js"

import _load from "../_load.js"
import errors from "../../errors.js"
import isMJS from "../../util/is-mjs.js"
import loader from "./loader.js"
import shared from "../../shared.js"

const {
  TYPE_ESM
} = ENTRY

const {
  OPTIONS_MODE_STRICT
} = PACKAGE

const {
  ERR_REQUIRE_ESM
} = errors

function load(request, parent, isMain, preload) {
  const { parsing, passthru } = shared.moduleState
  const filename = Module._resolveFilename(request, parent, isMain)
  const state = parsing ? shared.parseState : Module

  let called = false

  const entry = _load(filename, parent, isMain, state, (entry) => {
    const mod = entry.module

    if (parent &&
        entry.type === TYPE_ESM) {
      const { options } = Entry.get(parent).package

      if (options.mode === OPTIONS_MODE_STRICT &&
          (! options.cjs.vars ||
          isMJS(parent))) {
        throw new ERR_REQUIRE_ESM(mod)
      }
    } else if (entry.type !== TYPE_ESM &&
        extname(filename) === ".mjs") {
      throw new ERR_REQUIRE_ESM(mod)
    }

    state._cache[filename] = mod

    if (! mod.paths) {
      mod.paths = Module._nodeModulePaths(dirname(filename))
    }

    if (passthru &&
        ! parsing) {
      return
    }

    called = true

    let threw = true

    try {
      loader(entry, preload)
      threw = false
    } finally {
      if (threw) {
        Reflect.deleteProperty(state._cache, filename)
      }
    }
  })

  if (! called &&
      preload) {
    preload(entry)
  }

  return entry.module.exports
}

export default load
