import SafeSet from "./builtin/set.js"

let rootModule = __non_webpack_module__
let seen = new SafeSet

while (rootModule.parent != null &&
    ! seen.has(rootModule.parent)) {
  rootModule = rootModule.parent
  seen.add(rootModule)
}

seen = null

export default rootModule
