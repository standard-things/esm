let rootModule = __non_webpack_module__
let { parent } = rootModule

const seen = new Set

while (parent != null &&
       ! seen.has(parent)) {
  seen.add(parent)
  rootModule = parent
  parent = rootModule.parent
}

export default rootModule
