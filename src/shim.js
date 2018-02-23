import functionPrototypeToString from "./shim/function-prototype-to-string.js"

const Shim = {
  __proto__: null,
  enable() {
    functionPrototypeToString.enable()
  }
}

export default Shim
