import Visitor from "../visitor.js"

import getNamesFromPattern from "../parse/get-names-from-pattern.js"
import getShadowed from "../parse/get-shadowed.js"
import overwrite from "../parse/overwrite.js"
import shared from "../shared.js"

function init() {
  const shadowedMap = new Map

  class AssignmentVisitor extends Visitor {
    reset(options) {
      this.addedExport = false
      this.addedImport = false
      this.assignableBindings = null
      this.importedBindings = null
      this.magicString = null
      this.possibleIndexes = null
      this.runtimeName = null

      if (options !== void 0) {
        this.addedExport = options.addedExport
        this.addedImport = options.addedImport
        this.assignableBindings = options.assignableBindings
        this.importedBindings = options.importedBindings
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

    if (visitor.addedImport) {
      for (const name of names) {
        if (Reflect.has(importedBindings, name) &&
            ! getShadowed(path, name, shadowedMap)) {
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

    if (visitor.addedExport) {
      for (const name of names) {
        if (assignableBindings[name] === true) {
          const shadowed = getShadowed(path, name, shadowedMap)

          if (shadowed === null ||
              shadowed.type === "FunctionDeclaration")  {
            // Wrap assignments to exported identifiers.
            magicString
              .prependLeft(start, runtimeName + ".u(")
              .prependRight(end, ")")

            return
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
