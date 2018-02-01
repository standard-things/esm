const { getOwnPropertyDescriptor } = Object

function getDescriptor(object, key) {
  return object == null
    ? null
    : (getOwnPropertyDescriptor(object, key) || null)
}

export default getDescriptor
