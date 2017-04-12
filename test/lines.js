import {
  strictEqual,
  // blank line
  deepEqual,
}
from "assert";

export
default

function check()

{
  const error = new Error; // Line 14
  const line = +error.stack.split("\n")[1].split(":")[1];
  strictEqual(line, 14);
}
