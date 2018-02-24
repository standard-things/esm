const _encodeURI = encodeURI

const encodeURIWrapper = function encodeURI(string) {
  return typeof string === "string"
    ? _encodeURI(string)
    : ""
}

export default encodeURIWrapper
