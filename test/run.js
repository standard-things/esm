describe("Parsing with " + JSON.stringify(
  process.env.REIFY_PARSER || "acorn"
), () => {
  require("./tests.js");
});
