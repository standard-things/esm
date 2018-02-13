import NullObject from "../null-object.js"

import _extensions from "./_extensions.js"
import _initPaths from "./_init-paths.js"

const state = new NullObject
state._cache = new NullObject
state._extensions = _extensions
state.globalPaths = _initPaths()
state.mainModule = null
state.parsing = null
state.passthru = null
state.requireDepth = 0
state.stat = null

export default state
