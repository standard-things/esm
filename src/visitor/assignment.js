import Visitor from "../visitor.js"

import getNamesFromPattern from "../parse/get-names-from-pattern.js"
import isShadowed from "../parse/is-shadowed.js"
import isOutsideFunction from "../parse/is-outside-function.js"
import overwrite from "../parse/overwrite.js"
import shared from "../shared.js"

function init() {
  const scopeMap = new Map
  const shadowedMap = new Map

  class AssignmentVisitor extends Visitor {
    reset(options) {
      this.assignableBindings = null
      this.importedBindings = null
      this.magicString = null
      this.possibleIndexes = null
      this.runtimeName = null
      this.transformImportBindingAssignments = false
      this.transformInsideFunctions = false
      this.transformOutsideFunctions = false

      if (options !== void 0) {
        this.assignableBindings = options.assignableBindings
        this.importedBindings = options.importedBindings
        this.magicString = options.magicString
        this.possibleIndexes = options.possibleIndexes
        this.runtimeName = options.runtimeName
        this.transformImportBindingAssignments = options.transformImportBindingAssignments
        this.transformInsideFunctions = options.transformInsideFunctions
        this.transformOutsideFunctions = options.transformOutsideFunctions
      }
    }

    visitAssignmentExpression(path) {
      checkAndMaybeWrap(this, path, "left")
      path.call(this, "visitWithoutReset", "right")
    }

    visitUpdateExpression(path) {
      checkAndMaybeWrap(this, path, "argument")
    }
  }

  function checkAndMaybeWrap(visitor, path, childName) {
    const {
      assignableBindings,
      importedBindings,
      magicString,
      runtimeName
    } = visitor

    const node = path.getValue()
    const child = node[childName]
    const names = getNamesFromPattern(child)
    const { end, start } = node

    if (visitor.transformImportBindingAssignments) {
      for (const name of names) {
        if (importedBindings.has(name) &&
            ! isShadowed(path, name, shadowedMap)) {
          // Throw a type error for assignments to imported bindings.
          const { original } = magicString
          const { right } = node

          let code =
            runtimeName + ".b(" +
            JSON.stringify(original.slice(child.start, child.end)) + ',"' +
            node.operator + '"'

          if (right !== void 0) {
            code += "," + original.slice(right.start, right.end)
          }

          code += ")"

          overwrite(
            visitor,
            start,
            end,
            code
          )

          break
        }
      }
    }

    const {
      transformInsideFunctions,
      transformOutsideFunctions
    } = visitor

    if (transformInsideFunctions ||
        transformOutsideFunctions) {
      const instrumentBoth =
        transformInsideFunctions &&
        transformOutsideFunctions

      for (const name of names) {
        if (assignableBindings.has(name) &&
            ! isShadowed(path, name, shadowedMap)) {
          if (instrumentBoth ||
              (transformInsideFunctions &&
               ! isOutsideFunction(path, name, scopeMap)) ||
              (transformOutsideFunctions &&
               isOutsideFunction(path, name, scopeMap))) {
            // Wrap assignments to exported identifiers.
            magicString
              .prependLeft(start, runtimeName + ".u(")
              .prependRight(end, ")")

            break
          }
        }
      }
    }
  }

  return new AssignmentVisitor
}

export default shared.inited
  ? shared.module.visitorAssignment
  : shared.module.visitorAssignment = init()
