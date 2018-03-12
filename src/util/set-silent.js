import silent from "./silent.js"

function setSilent(object, key, value) {
  try {
    silent(() => {
      object[key] = value
    })
  } catch (e) {}
}

export default setSilent
