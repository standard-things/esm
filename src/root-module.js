let rootModule = __non_webpack_module__

while (rootModule.parent != null) {
  rootModule = rootModule.parent
}

export default rootModule
