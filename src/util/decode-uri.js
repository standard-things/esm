import shared from "../shared.js"

function init() {
  const _decodeURI = decodeURI

  const wrapper = function decodeURI(string) {
    return typeof string === "string"
      ? _decodeURI(string)
      : ""
  }

  return wrapper
}

export default shared.inited
  ? shared.module.utilDecodeURI
  : shared.module.utilDecodeURI = init()
