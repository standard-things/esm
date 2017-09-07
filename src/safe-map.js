const {
  defineProperty,
  getOwnPropertyDescriptor,
  getOwnPropertyNames,
  setPrototypeOf
} = Object

class SafeMap extends Map {}

const names = getOwnPropertyNames(Map.prototype)

for (const name of names) {
  const descriptor = getOwnPropertyDescriptor(Map.prototype, name)
  defineProperty(SafeMap.prototype, name, descriptor)
}

setPrototypeOf(SafeMap.prototype, null)

export default SafeMap
