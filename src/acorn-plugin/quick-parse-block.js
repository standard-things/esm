// Based on the `parseBlock` modification of esmod.
// Copyright Ingvar Stepanyan. Released under MIT license:
// https://github.com/RReverser/esmod/blob/master/index.js

const Plugin = {
  __proto__: null,
  enable(parser) {
    parser.parseBlock = parseBlock
    return parser
  }
}

function parseBlock() {
  // Tokenize inner block statements, including function bodies,
  // without creating the AST.
  const node = this.startNode()
  const prevPos = this.context.length - 1

  node.body = []

  do {
    this.next()
  } while (this.context.length > prevPos)

  this.next()

  return this.finishNode(node, "BlockStatement")
}

export default Plugin
