const hasOwn = Object.prototype.hasOwnProperty

export default function has(object, key) {
  return object != null && hasOwn.call(object, key)
}
