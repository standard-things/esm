import shared from "../shared.js"

function init() {
  const _encodeURI = encodeURI

  return function encodeURI(string) {
    return typeof string === "string"
      ? _encodeURI(string)
      : ""
  }
}

export default shared.inited
  ? shared.module.utilEncodeURI
  : shared.module.utilEncodeURI = init()
