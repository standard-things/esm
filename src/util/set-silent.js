import shared from "../shared.js"
import silent from "./silent.js"

function init() {
  function setSilent(object, name, value) {
    silent(() => {
      try {
        object[name] = value
      } catch {}
    })
  }

  return setSilent
}

export default shared.inited
  ? shared.module.utilSetSilent
  : shared.module.utilSetSilent = init()
