import silent from "./silent.js"

function setSilent(object, name, value) {
  try {
    silent(() => {
      object[name] = value
    })
  } catch (e) {}
}

export default setSilent
