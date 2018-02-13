import _extensions from "./_extensions.js"
import _initPaths from "./_init-paths.js"

const state = {
  __proto__: null,
  _cache: { __proto__: null },
  _extensions,
  globalPaths: _initPaths(),
  mainModule: null,
  parsing: null,
  passthru: null,
  requireDepth: 0,
  stat: null
}

export default state
