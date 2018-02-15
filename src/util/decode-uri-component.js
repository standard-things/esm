import shared from "../shared.js"

const _decodeURIComponent = shared.decodeURIComponent

function decodeURIComponent(string) {
  return typeof string === "string"
    ? _decodeURIComponent(string)
    : ""
}

export default decodeURIComponent
