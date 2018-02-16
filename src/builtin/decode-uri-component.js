import shared from "../shared.js"

function init() {
  const _decodeURIComponent = shared.global.decodeURIComponent

  return function decodeURIComponent(string) {
    return typeof string === "string"
      ? _decodeURIComponent(string)
      : ""
  }
}

export default shared.inited
  ? shared.builtin.decodeURIComponent
  : shared.builtin.decodeURIComponent = init()
