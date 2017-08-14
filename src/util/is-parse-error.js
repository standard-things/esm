import isError from "./is-error.js"
import isObject from "./is-object.js"

function isParseError(value) {
  return isError(value) && typeof value.pos === "number" &&
    typeof value.raisedAt === "number" && isObject(value.loc)
}

export default isParseError
