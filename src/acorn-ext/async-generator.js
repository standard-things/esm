// Support for async generators and for-await-of adapted from Babylon.
// Copyright Babylon contributors. Released under MIT license:
// https://github.com/babel/babel/blob/master/packages/babylon/src/parser/expression.js
// https://github.com/babel/babel/blob/master/packages/babylon/src/parser/statement.js

import { DestructuringErrors } from "../vendor/acorn/src/parseutil.js"

import { types as tt } from "../vendor/acorn/src/tokentype.js"

const loopLabel = { kind: "loop" }

function enable(parser) {
  parser.parseForIn = parseForIn
  parser.parseForStatement = parseForStatement
  parser.parseFunction = parseFunction
  parser.parseProperty = parseProperty
  return parser
}

function parseForIn(node, init, forAwait) {
  const type = forAwait
    ? "ForAwaitStatement"
    : (this.type === tt._in ? "ForInStatement" : "ForOfStatement")

  this.next()

  node.left = init
  node.right = this.parseExpression()

  this.expect(tt.parenR)

  node.body = this.parseStatement(false)
  this.labels.pop()
  return this.finishNode(node, type)
}

function parseForStatement(node) {
  this.next()
  this.labels.push(loopLabel)

  const forAwait =
    this.inAsync &&
    this.eatContextual("await")

  this.expect(tt.parenL)

  if (this.type === tt.semi) {
    if (forAwait) {
      this.unexpected()
    }

    return this.parseFor(node, null)
  }

  const isLet = this.isLet()

  if (isLet ||
      this.type === tt._var ||
      this.type === tt._const) {
    const init = this.startNode()
    const kind = isLet ? "let" : this.value

    this.next()
    this.parseVar(init, true, kind)
    this.finishNode(init, "VariableDeclaration")

    const { declarations } = init

    if ((this.type === tt._in ||
         this.isContextual("of")) &&
        declarations.length === 1 &&
        ! (kind !== "var" && declarations[0].init)) {
      return this.parseForIn(node, init, forAwait)
    }

    if (forAwait) {
      this.unexpected()
    }

    return this.parseFor(node, init)
  }

  const refDestructuringErrors = new DestructuringErrors
  const init = this.parseExpression(true, refDestructuringErrors)

  if (this.type === tt._in ||
      this.isContextual("of")) {
    this.toAssignable(init)
    this.checkLVal(init)
    return this.parseForIn(node, init, forAwait)
  }

  if (forAwait) {
    this.unexpected()
  }

  return this.parseFor(node, init)
}

function parseFunction(node, isStatement, allowExpressionBody, isAsync) {
  this.initFunction(node)

  node.async = !! isAsync
  node.generator = this.eat(tt.star)
  node.id = null

  if (isStatement &&
      isStatement !== "nullableID" &&
      this.type === tt.name) {
    node.id = this.parseIdent()
    this.checkLVal(node.id, "var")
  }

  const oldAwaitPos = this.awaitPos
  const oldInAsync = this.inAsync
  const oldInFunc = this.inFunction
  const oldInGen = this.inGenerator
  const oldYieldPos = this.yieldPos

  this.awaitPos = 0
  this.inAsync = node.async
  this.inFunction = true
  this.inGenerator = node.generator
  this.yieldPos = 0

  if (this.type === tt.name ||
      this.type === tt._yield) {
    node.id = this.parseIdent(true)
  }

  this.parseFunctionParams(node)
  this.parseFunctionBody(node, allowExpressionBody)

  this.awaitPos = oldAwaitPos
  this.inAsync = oldInAsync
  this.inFunction = oldInFunc
  this.inGenerator = oldInGen
  this.yieldPos = oldYieldPos

  return this.finishNode(node, isStatement ? "FunctionDeclaration" : "FunctionExpression")
}

function parseProperty(isPattern, refDestructuringErrors) {
  const propNode = this.startNode()

  propNode.method =
  propNode.shorthand = false

  let startPos
  let startLoc

  if (isPattern ||
      refDestructuringErrors) {
    startPos = this.start
    startLoc = this.startLoc
  }

  let isAsync = false
  let isGenerator = ! isPattern && this.eat(tt.star)

  if (! isPattern &&
      ! isGenerator &&
      this.isContextual("async")) {
    const asyncId = this.parseIdent()

    if (this.type === tt.colon  ||
        this.type === tt.parenL ||
        this.type === tt.braceR ||
        this.type === tt.eq     ||
        this.type === tt.comma) {
      propNode.key = asyncId
      propNode.computed = false
    } else {
      isAsync = true
      isGenerator = this.eat(tt.star)
      this.parsePropertyName(propNode)
    }
  } else {
    this.parsePropertyName(propNode)
  }

  this.parsePropertyValue(propNode, isPattern, isGenerator, isAsync, startPos, startLoc, refDestructuringErrors)
  return this.finishNode(propNode, "Property")
}

export { enable }
