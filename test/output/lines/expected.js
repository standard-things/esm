module.export({default:()=>check});var strictEqual,deepEqual;module.watch(require("assert"),{strictEqual(v){strictEqual=v},deepEqual(v){deepEqual=v}},0);









function check()

{
  const error = new Error; // Line 14
  const line = +error.stack.split("\n")[1].split(":")[1];
  strictEqual(line, 14);
}
