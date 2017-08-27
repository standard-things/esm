const globalDecodeURIComponent = global.decodeURIComponent

function decodeURIComponent(string) {
  return typeof string === "string" ? globalDecodeURIComponent(string) : ""
}

export default decodeURIComponent
