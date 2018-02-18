import shared from "../shared.js"

const _decodeURIComponent = decodeURIComponent

function init() {
  return function decodeURIComponent(string) {
    return typeof string === "string"
      ? _decodeURIComponent(string)
      : ""
  }
}

export default shared.inited
  ? shared.builtin.decodeURIComponent
  : shared.builtin.decodeURIComponent = init()
