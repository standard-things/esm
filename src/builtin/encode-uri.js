import shared from "../shared.js"

function init() {
  const _encodeURI = shared.global.encodeURI

  return function encodeURI(string) {
    return typeof string === "string"
      ? _encodeURI(string)
      : ""
  }
}

export default shared.inited
  ? shared.encodeURI
  : shared.encodeURI = init()
