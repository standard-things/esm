import FastObject from "./fast-object.js"

const ids = ["config", "fs", "natives", "util"]

const binding = ids.reduce((binding, id) => {
  try {
    binding[id] = process.binding(id)
  } catch (e) {
    binding[id] = Object.create(null)
  }

  return binding
}, new FastObject)

export default binding
