import FastObject from "../fast-object.js"

import _initPaths from "./_init-paths.js"
import extensions from "./extensions.js"

const state = new FastObject
state._cache = new FastObject
state._extensions = extensions
state.globalPaths = _initPaths()
state.requireDepth = 0

export default state
