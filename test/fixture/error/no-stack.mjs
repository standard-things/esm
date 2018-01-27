global.customError = new Error
delete customError.stack
throw customError
