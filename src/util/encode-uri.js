const _encodeURI = global.encodeURI

function encodeURI(string) {
  return typeof string === "string"
    ? _encodeURI(string)
    : ""
}

export default encodeURI
