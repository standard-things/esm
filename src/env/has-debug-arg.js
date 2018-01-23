const debugArgRegExp = /^--(?:debug|inspect)(?:-brk)?$/

function hasDebugArg(args) {
  return args.some((arg) => debugArgRegExp.test(arg))
}

export default hasDebugArg
