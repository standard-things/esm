const _encodeURIComponent = global.encodeURIComponent

function encodeURIComponent(string) {
  return typeof string === "string" ? _encodeURIComponent(string) : ""
}

export default encodeURIComponent
