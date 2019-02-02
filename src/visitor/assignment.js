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
      this.instrumentImportBindingAssignments = false
      this.instrumentInsideFunctions = false
      this.instrumentOutsideFunctions = false
      this.magicString = null
      this.possibleIndexes = null
      this.runtimeName = null

      if (options !== void 0) {
        this.assignableBindings = options.assignableBindings
        this.importedBindings = options.importedBindings
        this.instrumentImportBindingAssignments = options.instrumentImportBindingAssignments
        this.instrumentInsideFunctions = options.instrumentInsideFunctions
        this.instrumentOutsideFunctions = options.instrumentOutsideFunctions
        this.magicString = options.magicString
        this.possibleIndexes = options.possibleIndexes
        this.runtimeName = options.runtimeName
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
    const names = getNamesFromPattern(node[childName])
    const { end, start } = node

    if (visitor.instrumentImportBindingAssignments) {
      for (const name of names) {
        if (Reflect.has(importedBindings, name) &&
            ! isShadowed(path, name, shadowedMap)) {
          // Throw a type error for assignments to imported bindings.
          overwrite(
            visitor,
            start,
            end,
            runtimeName + ".b()"
          )
        }
      }
    }

    const {
      instrumentInsideFunctions,
      instrumentOutsideFunctions
    } = visitor

    if (instrumentInsideFunctions ||
        instrumentOutsideFunctions) {
      const instrumentBoth =
        instrumentInsideFunctions &&
        instrumentOutsideFunctions

      for (const name of names) {
        if (assignableBindings[name] === true &&
            ! isShadowed(path, name, shadowedMap)) {
          if (instrumentBoth ||
              (instrumentInsideFunctions &&
               ! isOutsideFunction(path, name, scopeMap)) ||
              (instrumentOutsideFunctions &&
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
