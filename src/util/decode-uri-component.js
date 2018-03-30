import shared from "../shared.js"

function init() {
  const _decodeURIComponent = decodeURIComponent

  const wrapper = function decodeURIComponent(string) {
    return typeof string === "string"
      ? _decodeURIComponent(string)
      : ""
  }

  return wrapper
}

export default shared.inited
  ? shared.module.utilDecodeURIComponent
  : shared.module.utilDecodeURIComponent = init()
