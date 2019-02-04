let rootModule = __non_webpack_module__

const seen = new Set

while (rootModule.parent != null &&
       ! seen.has(rootModule.parent)) {
  rootModule = rootModule.parent
  seen.add(rootModule)
}

export default rootModule
