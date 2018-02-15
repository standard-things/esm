import shared from "../shared.js"

const _encodeURI = shared.encodeURI

function encodeURI(string) {
  return typeof string === "string"
    ? _encodeURI(string)
    : ""
}

export default encodeURI
