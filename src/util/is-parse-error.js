import isObject from "./is-object.js"

export default function isParseError(value) {
  return isObject(value) && value.name === "SyntaxError" &&
    typeof value.pos === "number" && typeof value.raisedAt === "number" &&
    isObject(value.loc)
}
