describe("Parsing with " + JSON.stringify(
  process.env.REIFY_PARSER || "acorn"
), function () {
  require("./tests.js");
});
