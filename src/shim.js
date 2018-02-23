import enableFunctionPrototypeToString from "./shim/function-prototype-to-string.js"

class Shim {
  static enable() {
    enableFunctionPrototypeToString()
  }
}

Object.setPrototypeOf(Shim.prototype, null)

export default Shim
