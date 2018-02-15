import _extensions from "./_extensions.js"
import shared from "../shared.js"

const { globalPaths } = shared

const state = {
  __proto__: null,
  _cache: { __proto__: null },
  _extensions,
  globalPaths,
  mainModule: null,
  parsing: null,
  passthru: null,
  requireDepth: 0,
  stat: null
}

export default state
