import Visitor from "../visitor.js"

import getNamesFromPattern from "../parse/get-names-from-pattern.js"
import isShadowed from "../parse/is-shadowed.js"
import isTopLevel from "../parse/is-top-level.js"
import overwrite from "../parse/overwrite.js"
import shared from "../shared.js"

function init() {
  const shadowedMap = new Map
  const topLevelMap = new Map

  class AssignmentVisitor extends Visitor {
    reset(options) {
      this.assignableBindings = null
      this.importedBindings = null
      this.instrumentImportBindingAssignments = false
      this.instrumentNestedAssignments = false
      this.instrumentTopLevelAssignments = false
      this.magicString = null
      this.possibleIndexes = null
      this.runtimeName = null

      if (options !== void 0) {
        this.assignableBindings = options.assignableBindings
        this.importedBindings = options.importedBindings
        this.instrumentImportBindingAssignments = options.instrumentImportBindingAssignments
        this.instrumentNestedAssignments = options.instrumentNestedAssignments
        this.instrumentTopLevelAssignments = options.instrumentTopLevelAssignments
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
      instrumentNestedAssignments,
      instrumentTopLevelAssignments
    } = visitor

    if (instrumentNestedAssignments ||
        instrumentTopLevelAssignments) {
      const instrumentBoth =
        instrumentNestedAssignments &&
        instrumentTopLevelAssignments

      for (const name of names) {
        if (assignableBindings[name] === true &&
            ! isShadowed(path, name, shadowedMap)) {
          if (instrumentBoth ||
              (instrumentNestedAssignments &&
               ! isTopLevel(path, name, topLevelMap)) ||
              (instrumentTopLevelAssignments &&
               isTopLevel(path, name, topLevelMap))) {
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
