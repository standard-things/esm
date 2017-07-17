const esSymKey = Symbol.for("__esModule")

function setESModule(exported) {
  exported[esSymKey] = true
  return exported
}

export default setESModule
