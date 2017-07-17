import has from "./has.js"

const lookupGetter = Object.prototype.__lookupGetter__

export default function getGetter(object, key) {
  return has(object, key) ? lookupGetter.call(object, key) : void 0
}
