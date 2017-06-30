_.export([["check",()=>check]]);let strictEqual;_.watch("assert",[["strictEqual",function(v){strictEqual=v}]]);







function check()

{
  const error = new Error // Line 12.
  const line = error.stack.match(/\.js:(\d+)/)[1]
  strictEqual(line, '12')
}
