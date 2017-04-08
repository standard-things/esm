module.export({default:()=>check});var strictEqual,deepEqual;module.importSync("assert",{"strictEqual":(v)=>{strictEqual=v},"deepEqual":(v)=>{deepEqual=v}},0);









function check()

{
  var error = new Error; // Line 14
  var line = +error.stack.split("\n")[1].split(":")[1];
  strictEqual(line, 14);
}
