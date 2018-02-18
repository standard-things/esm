import shared from "../shared.js"

const _encodeURI = encodeURI

function init() {
  return function encodeURI(string) {
    return typeof string === "string"
      ? _encodeURI(string)
      : ""
  }
}

export default shared.inited
  ? shared.builtin.encodeURI
  : shared.builtin.encodeURI = init()
