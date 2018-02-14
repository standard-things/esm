import silent from "./silent.js"

function setSilent(object, key, value) {
  silent(() => {
    object[key] = value
  })
}

export default setSilent
