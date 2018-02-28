function keysAll(object) {
  return object == null
    ? []
    : Reflect.ownKeys(object)
}

export default keysAll
