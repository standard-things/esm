global.customError = new Error
Reflect.deleteProperty(customError, "stack")
throw customError
