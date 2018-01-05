const _decodeURI = global.decodeURI

function decodeURI(string) {
  return typeof string === "string" ? _decodeURI(string) : ""
}

export default decodeURI
