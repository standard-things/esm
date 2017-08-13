_.e([["check",()=>check]]);let assert;_.w("assert",[["default",function(v){assert=v}]]);







function check()

{
  const error = new Error // Line 12.
  const line = error.stack.match(/:(\d+)/)[1]
  assert.strictEqual(line, "12")
}
