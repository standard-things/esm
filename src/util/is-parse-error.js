import isObject from "./is-object.js"

function isParseError(value) {
  return isObject(value) && typeof value.name === "string" &&
    typeof value.pos === "number" && typeof value.raisedAt === "number" &&
    isObject(value.loc)
}

export default isParseError
