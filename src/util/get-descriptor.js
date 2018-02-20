function getDescriptor(object, key) {
  if (object == null) {
    return null
  }

  return Object.getOwnPropertyDescriptor(object, key) || null
}

export default getDescriptor
