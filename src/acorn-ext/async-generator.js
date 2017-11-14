// Support for async generators and for-await-of adapted from Babylon.
// Copyright Babylon contributors. Released under MIT license:
// https://github.com/babel/babel/blob/master/packages/babylon/src/parser/expression.js
// https://github.com/babel/babel/blob/master/packages/babylon/src/parser/statement.js

import { DestructuringErrors } from "../vendor/acorn/src/parseutil.js"

import { types as tt } from "../vendor/acorn/src/tokentype.js"

const loopLabel = { kind: "loop" }

function enable(parser) {
  parser.parseClass = parseClass
  parser.parseForIn = parseForIn
  parser.parseForStatement = parseForStatement
  parser.parseFunction = parseFunction
  parser.parseProperty = parseProperty
  return parser
}

function parseClass(node, isStatement) {
  this.next()

  this.parseClassId(node, isStatement)
  this.parseClassSuper(node)
  let classBody = this.startNode()
  let hadConstructor = false
  classBody.body = []
  this.expect(tt.braceL)
  while (!this.eat(tt.braceR)) {
    if (this.eat(tt.semi)) {
      continue
    }
    let method = this.startNode()
    let isGenerator = this.eat(tt.star)
    let isAsync = false
    let isMaybeStatic = this.type === tt.name && this.value === "static"
    this.parsePropertyName(method)
    method.static = isMaybeStatic && this.type !== tt.parenL
    if (method.static) {
      if (isGenerator) {
        this.unexpected()
      }
      isGenerator = this.eat(tt.star)
      this.parsePropertyName(method)
    }
    if (this.options.ecmaVersion >= 8 && !isGenerator && !method.computed &&
        method.key.type === "Identifier" && method.key.name === "async" && this.type !== tt.parenL &&
        !this.canInsertSemicolon()) {
      isAsync = true
      isGenerator = this.eat(tt.star)
      this.parsePropertyName(method)
    }
    method.kind = "method"
    let isGetSet = false
    if (!method.computed) {
      let {key} = method
      if (!isGenerator && !isAsync && key.type === "Identifier" && this.type !== tt.parenL && (key.name === "get" || key.name === "set")) {
        isGetSet = true
        method.kind = key.name
        key = this.parsePropertyName(method)
      }
      if (!method.static && (key.type === "Identifier" && key.name === "constructor" ||
          key.type === "Literal" && key.value === "constructor")) {
        if (hadConstructor) {
          this.raise(key.start, "Duplicate constructor in the same class")
        }
        if (isGetSet) {
          this.raise(key.start, "Constructor can't have get/set modifier")
        }
        if (isGenerator) {
          this.raise(key.start, "Constructor can't be a generator")
        }
        if (isAsync) {
          this.raise(key.start, "Constructor can't be an async method")
        }
        method.kind = "constructor"
        hadConstructor = true
      }
    }
    this.parseClassMethod(classBody, method, isGenerator, isAsync)
    if (isGetSet) {
      let paramCount = method.kind === "get" ? 0 : 1
      if (method.value.params.length !== paramCount) {
        let start = method.value.start
        if (method.kind === "get") {
          this.raiseRecoverable(start, "getter should have no params")
        } else {
          this.raiseRecoverable(start, "setter should have exactly one param")
        }
      } else {
        if (method.kind === "set" && method.value.params[0].type === "RestElement") {
          this.raiseRecoverable(method.value.params[0].start, "Setter cannot use rest params")
        }
      }
    }
  }
  node.body = this.finishNode(classBody, "ClassBody")
  return this.finishNode(node, isStatement ? "ClassDeclaration" : "ClassExpression")
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
