"use strict";

const acorn = require("acorn");
const dummyParser = new acorn.Parser;

function lookahead(parser) {
  dummyParser.input = parser.input;
  dummyParser.pos = parser.pos;
  dummyParser.nextToken();
  return dummyParser;
}

exports.lookahead = lookahead;
