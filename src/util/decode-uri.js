const globalDecodeURI = global.decodeURI

function decodeURI(string) {
  return typeof string === "string" ? globalDecodeURI(string) : ""
}

export default decodeURI
