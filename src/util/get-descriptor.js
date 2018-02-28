function getDescriptor(object, key) {
  if (object == null) {
    return null
  }

  return Reflect.getOwnPropertyDescriptor(object, key) || null
}

export default getDescriptor
