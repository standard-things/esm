function isUpdatableSet(object, name) {
  const descriptor = Reflect.getOwnPropertyDescriptor(object, name)

  if (descriptor) {
    // Section 9.5.9: [[Set]]()
    // Step 11: If either the data descriptor is not configurable or writable, or
    // the accessor descriptor has no setter, then the value must be the same.
    // https://tc39.github.io/ecma262/#sec-proxy-object-internal-methods-and-internal-slots-set-p-v-receiver
    if (descriptor.configurable ||
        (Reflect.has(descriptor, "writable")
          ? descriptor.writable
          : descriptor.set
        )) {
      return true
    }

    return false
  }

  return true
}

export default isUpdatableSet
