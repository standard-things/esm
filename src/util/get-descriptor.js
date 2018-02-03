const { getOwnPropertyDescriptor } = Object

function getDescriptor(object, key) {
  if (object == null) {
    return null
  }

  return getOwnPropertyDescriptor(object, key) || null
}

export default getDescriptor
