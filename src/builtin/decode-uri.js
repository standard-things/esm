import shared from "../shared.js"

const _decodeURI = decodeURI

function init() {
  return function decodeURI(string) {
    return typeof string === "string"
      ? _decodeURI(string)
      : ""
  }
}

export default shared.inited
  ? shared.builtin.decodeURI
  : shared.builtin.decodeURI = init()

