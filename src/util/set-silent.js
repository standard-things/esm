import silent from "./silent.js"

function setSilent(object, name, value) {
  silent(() => {
    try {
      object[name] = value
    } catch (e) {}
  })
}

export default setSilent
