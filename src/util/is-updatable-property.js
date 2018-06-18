function isUpdatableProperty(object, name) {
  const descriptor = Reflect.getOwnPropertyDescriptor(object, name)

  if (descriptor) {
    // Section 9.5.8: [[Get]]()
    // Step 10: If either the data descriptor is not configurable or writable, or
    // the accessor descriptor has no getter, then the value must be the same.
    // https://tc39.github.io/ecma262/#sec-proxy-object-internal-methods-and-internal-slots-get-p-receiver
    if (descriptor.configurable === true) {
      return true
    }

    return descriptor.set
      ? descriptor.get !== void 0
      : descriptor.writable === true
  }

  return true
}

export default isUpdatableProperty
