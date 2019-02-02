// Based on acorn-dynamic-import.
// Copyright Jordan Gensler. Released under MIT license:
// https://github.com/kesne/acorn-dynamic-import

import noop from "../../util/noop.js"
import shared from "../../shared.js"

function init() {
  const Plugin = {
    enable(walk) {
      walk.base.Import = noop

      return walk
    }
  }

  return Plugin
}

export default shared.inited
  ? shared.module.acornWalkDynamicImport
  : shared.module.acornWalkDynamicImport = init()
