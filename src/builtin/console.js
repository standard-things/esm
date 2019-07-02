import ENV from "../constant/env.js"

import GenericFunction from "../generic/function.js"
import GenericObject from "../generic/object.js"
import OwnProxy from "../own/proxy.js"

import assign from "../util/assign.js"
import binding from "../binding.js"
import builtinUtil from "./util.js"
import copyProperty from "../util/copy-property.js"
import has from "../util/has.js"
import isNativeLikeFunction from "../util/is-native-like-function.js"
import isObjectLike from "../util/is-object.js"
import isUpdatableDescriptor from "../util/is-updatable-descriptor.js"
import isUpdatableGet from "../util/is-updatable-get.js"
import keys from "../util/keys.js"
import ownKeys from "../util/own-keys.js"
import maskFunction from "../util/mask-function.js"
import realConsole from "../real/console.js"
import safeConsole from "../safe/console.js"
import safeGlobalConsole from "../safe/global-console.js"
import safeProcess from "../safe/process.js"
import setProperty from "../util/set-property.js"
import setPrototypeOf from "../util/set-prototype-of.js"
import shared from "../shared.js"
import toExternalFunction from "../util/to-external-function.js"
import toString from "../util/to-string.js"

const {
  ELECTRON_RENDERER,
  FLAGS,
  HAS_INSPECTOR
} = ENV

const SafeConsole = safeConsole.Console
const SafeProto = SafeConsole.prototype
const SafeProtoNames = ownKeys(SafeProto)

const dirOptions = { customInspect: true }
const wrapperMap = createWrapperMap(SafeProto)

let isConsoleSymbol = findByRegExp(Object.getOwnPropertySymbols(safeConsole), /IsConsole/i)

if (typeof isConsoleSymbol !== "symbol") {
  isConsoleSymbol = Symbol("kIsConsole")
}

function assertWrapper(func, [expression, ...rest]) {
  return Reflect.apply(func, this, [expression, ...transform(rest, toCustomInspectable)])
}

function createBuiltinConsole() {
  const newBuiltinConsole = tryCreateConsole(safeProcess)

  if (newBuiltinConsole === null) {
    return realConsole
  }

  if (HAS_INSPECTOR &&
      FLAGS.inspect) {
    const { consoleCall } = binding.inspector
    const { originalConsole } = shared
    const useConsoleCall = typeof consoleCall === "function"

    const emptyConfig = useConsoleCall
      ? {}
      : null

    const originalNames = keys(originalConsole)

    for (const name of originalNames) {
      if (! isKeyAssignable(name)) {
        continue
      }

      const originalFunc = originalConsole[name]

      if (typeof originalFunc === "function") {
        const builtinFunc = newBuiltinConsole[name]

        if (useConsoleCall &&
            typeof builtinFunc === "function" &&
            has(newBuiltinConsole, name)) {
          // Use `consoleCall()` to combine `builtinFunc()` and
          // `originalFunc()` without adding to the call stack.
          setProperty(newBuiltinConsole, name, GenericFunction.bind(
            consoleCall,
            void 0,
            originalFunc,
            builtinFunc,
            emptyConfig
          ))
        } else {
          setProperty(newBuiltinConsole, name, originalFunc)
        }
      }
    }
  } else if (ELECTRON_RENDERER) {
    const globalNames = keys(safeGlobalConsole)

    for (const name of globalNames) {
      if (! isKeyAssignable(name)) {
        continue
      }

      const globalFunc = safeGlobalConsole[name]

      if (typeof globalFunc === "function") {
        setProperty(newBuiltinConsole, name, globalFunc)
      }
    }
  }

  const safeNames = ownKeys(safeConsole)

  for (const name of safeNames) {
    if (isKeyAssignable(name) &&
        ! has(newBuiltinConsole, name)) {
      copyProperty(newBuiltinConsole, safeConsole, name)
    }
  }

  newBuiltinConsole.Console = Console

  return newBuiltinConsole
}

function createBuiltinMethodMap(consoleObject) {
  const names = keys(consoleObject)
  const newBuiltinMethodMap = new Map

  for (const name of names) {
    const func = consoleObject[name]
    const globalFunc = safeGlobalConsole[name]

    if (typeof func === "function" &&
        typeof globalFunc === "function" &&
        (! isKeyAssignable(name) ||
         isNativeLikeFunction(globalFunc))) {
      newBuiltinMethodMap.set(globalFunc, func)
    }
  }

  return newBuiltinMethodMap
}

function createConsole({ stderr, stdout }) {
  const ConsoleProto = Console.prototype

  const newConsole = Reflect.construct(Console,
    shared.support.consoleOptions
      ? [{ stderr, stdout }]
      : [stdout, stderr]
  )

  setPrototypeOf(newConsole, GenericObject.create())

  for (const name of SafeProtoNames) {
    if (isKeyAssignable(name) &&
        ! has(newConsole, name)) {
      copyProperty(newConsole, ConsoleProto, name)
    }
  }

  return newConsole
}

function createWrapperMap(consoleObject) {
  const wrappedLog = wrapBuiltin(consoleObject.log, logWrapper)

  const newWrapperMap = new Map([
    ["assert", wrapBuiltin(consoleObject.assert, assertWrapper)],
    ["debug", wrappedLog],
    ["dir", wrapBuiltin(consoleObject.dir, dirWrapper)],
    ["dirxml", wrappedLog],
    ["info", wrappedLog],
    ["log", wrappedLog],
    ["trace", wrapBuiltin(consoleObject.trace)],
    ["warn", wrapBuiltin(consoleObject.warn)]
  ])

  const names = keys(consoleObject)

  for (const name of names) {
    if (isKeyAssignable(name) &&
        ! newWrapperMap.has(name)) {
      const func = consoleObject[name]

      if (typeof func === "function") {
        newWrapperMap.set(name, wrapBuiltin(func))
      }
    }
  }

  return newWrapperMap
}

function defaultWrapper(func, args) {
  return Reflect.apply(func, this, args)
}

function dirWrapper(func, [object, options]) {
  return Reflect.apply(func, this, [{
    [shared.customInspectKey](recurseTimes, context) {
      const contextAsOptions = assign({}, context, options)

      contextAsOptions.customInspect = has(options, "customInspect")
        ? options.customInspect
        : false

      contextAsOptions.depth = recurseTimes

      return builtinUtil.inspect(object, contextAsOptions)
    }
  }, dirOptions])
}

function findByRegExp(array, regexp) {
  for (const value of array) {
    if (regexp.test(toString(value))) {
      return value
    }
  }
}

function isKeyAssignable(name) {
  return name !== "Console" &&
         name !== "constructor"
}

function logWrapper(func, args) {
  return Reflect.apply(func, this, transform(args, toCustomInspectable))
}

function toCustomInspectable(value) {
  if (! isObjectLike(value)) {
    return value
  }

  return {
    [shared.customInspectKey](recurseTimes, context) {
      const contextAsOptions = assign({}, context)

      contextAsOptions.depth = recurseTimes

      return builtinUtil.inspect(value, contextAsOptions)
    }
  }
}

function transform(array, iteratee) {
  const { length } = array

  let i = -1

  while (++i < length) {
    array[i] = iteratee(array[i])
  }

  return array
}

function tryCreateConsole(processObject) {
  try {
    return createConsole(processObject)
  } catch {}

  return null
}

function wrapBuiltin(builtinFunc, wrapper = defaultWrapper) {
  // Define method with shorthand syntax so it's not constructable.
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Method_definitions#Method_definitions_are_not_constructable
  const object = {
    method(...args) {
      const { defaultInspectOptions } = shared
      const { customInspect } = defaultInspectOptions

      setProperty(defaultInspectOptions, "customInspect", true)

      try {
        return Reflect.apply(wrapper, this, [builtinFunc, args])
      } finally {
        setProperty(defaultInspectOptions, "customInspect", customInspect)
      }
    }
  }

  return maskFunction(object.method, builtinFunc)
}

const Console = maskFunction(function (...args) {
  const newTarget = new.target

  if (newTarget === void 0) {
    return Reflect.construct(Console, args)
  }

  this[isConsoleSymbol] = true

  const ConsoleProto = Console.prototype
  const ConsoleProtoNames = keys(ConsoleProto)

  for (const name of ConsoleProtoNames) {
    if (isKeyAssignable(name)) {
      const func = this[name]

      if (typeof func === "function") {
        this[name] = GenericFunction.bind(func, this)
      }
    }
  }

  const newSafeConsole = Reflect.construct(SafeConsole, args, newTarget)
  const newSafeNames = ownKeys(newSafeConsole)

  for (const name of newSafeNames) {
    if (isKeyAssignable(name) &&
        ! has(this, name)) {
      copyProperty(this, newSafeConsole, name)
    }
  }
}, SafeConsole)

const ConsoleProto = Console.prototype

for (const name of SafeProtoNames) {
  if (! isKeyAssignable(name)) {
    continue
  }

  const wrapped = wrapperMap.get(name)

  if (wrapped === void 0) {
    copyProperty(ConsoleProto, SafeProto, name)
  } else {
    const descriptor = Reflect.getOwnPropertyDescriptor(SafeProto, name)

    Reflect.defineProperty(ConsoleProto, name, {
      configurable: descriptor.configurable,
      enumerable: descriptor.enumerable,
      value: wrapped,
      writable:
        descriptor.writable === true ||
        typeof descriptor.set === "function"
    })
  }
}

Reflect.defineProperty(Console, Symbol.hasInstance, {
  value: toExternalFunction((instance) => instance[isConsoleSymbol])
})

let builtinConsole
let builtinMethodMap

const proxy = new OwnProxy(console, {
  get(console, name, receiver) {
    if (receiver === proxy) {
      receiver = console
    }

    const value = Reflect.get(console, name, receiver)

    if (isUpdatableGet(console, name)) {
      if (builtinConsole === void 0) {
        builtinConsole = createBuiltinConsole()
        builtinMethodMap = createBuiltinMethodMap(builtinConsole)
      }

      const builtinMethod = builtinMethodMap.get(value)

      if (builtinMethod !== void 0) {
        return builtinMethod
      }
    }

    return value
  },
  getOwnPropertyDescriptor(console, name) {
    const descriptor = Reflect.getOwnPropertyDescriptor(console, name)

    if (isUpdatableDescriptor(descriptor)) {
      if (builtinConsole === void 0) {
        builtinConsole = createBuiltinConsole()
        builtinMethodMap = createBuiltinMethodMap(builtinConsole)
      }

      const builtinMethod = builtinMethodMap.get(descriptor.value)

      if (builtinMethod !== void 0) {
        descriptor.value = builtinMethod
      }
    }

    return descriptor
  }
})

export default proxy
