import foo from "./foo.ts"

foo()
  .then((out) =>
    process.stdout.write(out)
  )
