import shared from "../shared.js"

function init() {
  const _decodeURI = decodeURI

  return function decodeURI(string) {
    return typeof string === "string"
      ? _decodeURI(string)
      : ""
  }
}

export default shared.inited
  ? shared.module.utilDecodeURI
  : shared.module.utilDecodeURI = init()
