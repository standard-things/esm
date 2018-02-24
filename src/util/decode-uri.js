const _decodeURI = decodeURI

const decodeURIWrapper = function decodeURI(string) {
  return typeof string === "string"
    ? _decodeURI(string)
    : ""
}

export default decodeURIWrapper
