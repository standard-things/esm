import Module from "../module.js"

const { keys } = Object

function clone(mod) {
  const copy = new Module(mod.id, null)
  const names = keys(mod)

  copy.id = mod.id
  copy.filename = mod.filename
  copy.parent = mod.parent

  for (const name of names) {
    if (name !== "constructor") {
      copy[name] = mod[name]
    }
  }

  return copy
}

export default clone
