const _decodeURIComponent = decodeURIComponent

const decodeURIComponentWrapper = function decodeURIComponent(string) {
  return typeof string === "string"
    ? _decodeURIComponent(string)
    : ""
}

export default decodeURIComponentWrapper
