module.export({check:()=>check});var strictEqual;module.watch(require("assert"),{strictEqual(v){strictEqual=v}},0);







function check() {
  const error = new Error // Line 12.
  const line = error.stack.match(/\.js:(\d+)/)[1]
  strictEqual(line, '12')
}
