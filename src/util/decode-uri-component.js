const _decodeURIComponent = global.decodeURIComponent

function decodeURIComponent(string) {
  return typeof string === "string" ? _decodeURIComponent(string) : ""
}

export default decodeURIComponent
