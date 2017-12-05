import FastObject from "../fast-object.js"

import _extensions from "./_extensions.js"
import _initPaths from "./_init-paths.js"

const state = new FastObject
state._cache = new FastObject
state._extensions = _extensions
state.globalPaths = _initPaths()
state.requireDepth = 0

export default state
