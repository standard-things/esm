import isObject from "./is-object.js"

function getModuleName(request) {
  if (typeof request === "string") {
    return request
  }

  return isObject(request)
    ? request.filename || request.id || ""
    : ""
}

export default getModuleName
