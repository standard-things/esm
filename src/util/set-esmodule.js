const esSymKey = Symbol.for("__esModule")

export default function setESModule(exported) {
  exported[esSymKey] = true
  return exported
}
