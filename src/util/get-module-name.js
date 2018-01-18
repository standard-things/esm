import isObject from "./is-object.js"

function getModuleName(request) {
  if (typeof request === "string") {
    return request
  }

  if (isObject(request)) {
    const { filename, id } = request

    if (typeof filename === "string") {
      return filename
    }

    if (typeof id === "string") {
      return id
    }
  }

  return ""
}

export default getModuleName
