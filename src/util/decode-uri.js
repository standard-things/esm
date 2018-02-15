import shared from "../shared.js"

const _decodeURI = shared.decodeURI

function decodeURI(string) {
  return typeof string === "string"
    ? _decodeURI(string)
    : ""
}

export default decodeURI
