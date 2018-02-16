import shared from "../shared.js"

function init() {
  const _decodeURI = shared.global.decodeURI

  return function decodeURI(string) {
    return typeof string === "string"
      ? _decodeURI(string)
      : ""
  }
}

export default shared.inited
  ? shared.builtin.decodeURI
  : shared.builtin.decodeURI = init()

