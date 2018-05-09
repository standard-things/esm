import shared from "../shared.js"

function init() {
  const _decodeURIComponent = decodeURIComponent

  return function decodeURIComponent(string) {
    return typeof string === "string"
      ? _decodeURIComponent(string)
      : ""
  }
}

export default shared.inited
  ? shared.module.utilDecodeURIComponent
  : shared.module.utilDecodeURIComponent = init()
