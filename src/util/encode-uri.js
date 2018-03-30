import shared from "../shared.js"

function init() {
  const _encodeURI = encodeURI

  const wrapper = function encodeURI(string) {
    return typeof string === "string"
      ? _encodeURI(string)
      : ""
  }

  return wrapper
}

export default shared.inited
  ? shared.module.utilEncodeURI
  : shared.module.utilEncodeURI = init()
