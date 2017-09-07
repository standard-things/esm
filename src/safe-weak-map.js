const {
  defineProperty,
  getOwnPropertyDescriptor,
  getOwnPropertyNames,
  setPrototypeOf
} = Object

class SafeWeakMap extends WeakMap {}

const names = getOwnPropertyNames(WeakMap.prototype)

for (const name of names) {
  const descriptor = getOwnPropertyDescriptor(WeakMap.prototype, name)
  defineProperty(SafeWeakMap.prototype, name, descriptor)
}

setPrototypeOf(SafeWeakMap.prototype, null)

export default SafeWeakMap
