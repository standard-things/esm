const imports = [
  import("./a.js"),
  import("./b.js")
]

for await (const i of imports) {}
