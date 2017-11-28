import has from "./has.js"

const { getOwnPropertyDescriptor } = Object

function getDescriptor(object, key) {
  const descriptor = has(object, key) && getOwnPropertyDescriptor(object, key)
  return descriptor || null
}

export default getDescriptor
