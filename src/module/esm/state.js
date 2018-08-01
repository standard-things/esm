import extensions from "./extensions.js"

const state = {
  extensions,
  globalPaths: null,
  mainModule: null,
  moduleCache: { __proto__: null },
  scratchCache: { __proto__: null }
}

export default state
