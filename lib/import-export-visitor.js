"use strict";

const assert = require("assert");
const getOption = require("./options.js").get;
const utils = require("./utils.js");

const MagicString = require("./magic-string.js");
const Visitor = require("./visitor.js");

const codeOfCR = "\r".charCodeAt(0);

class ImportExportVisitor extends Visitor {
  finalizeHoisting() {
    const infoCount = this.bodyInfos.length;
    const isModule = this.sourceType === "module";

    for (let i = 0; i < infoCount; ++i) {
      const bodyInfo = this.bodyInfos[i];
      let codeToInsert = "";

      if (bodyInfo.needToAddUseStrictDirective &&
          (this.madeChanges || isModule)) {
        this.madeChanges = true;
        codeToInsert += '"use strict";';
      }

      if (bodyInfo.parent.type === "Program" &&
          this.moduleAlias !== "module") {
        codeToInsert +=
          (this.generateLetDeclarations ? "const " : "var ") +
          this.moduleAlias + "=module;";
      }

      codeToInsert +=
        toModuleExport(this, bodyInfo.hoistedExportsMap, false) +
        toModuleExport(this, bodyInfo.hoistedConstExportsMap, true) +
        bodyInfo.hoistedExportsString +
        bodyInfo.hoistedImportsString;

      if (codeToInsert) {
        if (this.magicString !== null) {
          this.magicString.prependRight(
            bodyInfo.insertCharIndex,
            codeToInsert
          );
        }

        if (this.modifyAST) {
          let ast = this.parse(codeToInsert);

          if (ast.type === "File") {
            ast = ast.program;
          }
          assert.strictEqual(ast.type, "Program");

          const spliceArgs = ast.body;
          spliceArgs.unshift(bodyInfo.insertNodeIndex, 0);

          const body = bodyInfo.body;
          body.splice.apply(body, spliceArgs);

          const parsedDirectives = ast.directives;
          const parentDirectives = bodyInfo.parent.directives;

          if (parsedDirectives && parentDirectives) {
            parentDirectives.push.apply(parentDirectives, parsedDirectives);
          }
        }
      }

      delete bodyInfo.parent._bodyInfoByName;
    }

    // Just in case we call finalizeHoisting again, don't hoist anything.
    this.bodyInfos.length = 0;

    if (this.modifyAST) {
      this.removals.forEach(processRemoval);

      // Just in case we call finalizeHoisting again, don't remove anything.
      this.removals.length = 0;
    }
  }

  reset(rootPath, codeOrNull, options) {
    if (typeof codeOrNull === "string") {
      this.code = codeOrNull;
      this.magicString = new MagicString(codeOrNull);
    } else {
      this.code = this.magicString = null;
    }

    this.bodyInfos = [];
    this.enforceStrictMode = getOption(options, "enforceStrictMode");
    this.exportedLocalNames = Object.create(null);
    this.generateArrowFunctions = !! getOption(options, "generateArrowFunctions");
    this.generateLetDeclarations = !! getOption(options, "generateLetDeclarations");
    this.madeChanges = false;
    this.modifyAST = !! getOption(options, "modifyAST");
    this.moduleAlias = getOption(options, "moduleAlias");
    this.nextKey = 0;
    this.parse = getOption(options, "parse");
    this.removals = [];
    this.sourceType = getOption(options, "sourceType");
  }

  visitProgram(path) {
    this.visitChildren(path);
    const program = path.getNode();
    if (program.body.length) {
      path.call(
        firstStmtPath => getBlockBodyInfo(this, firstStmtPath),
        "body", 0
      );
    } else {
      getBlockBodyInfo(this, path);
    }
  }

  visitCallExpression(path) {
    const node = path.getNode();
    const callee = node.callee;

    if (callee.type === "Import") {
      this.madeChanges = true;
      overwrite(this, callee.start, callee.end, this.moduleAlias + ".import");
    }

    this.visitChildren(path);
  }

  visitImportDeclaration(path) {
    const decl = path.getValue();
    const specifierCount = decl.specifiers.length;
    const namespaces = [];
    let hoistedCode = "";

    if (specifierCount) {
      const identifiers = [];

      for (let i = 0; i < specifierCount; ++i) {
        const s = decl.specifiers[i];
        const name = s.local.name;

        if (s.type === "ImportNamespaceSpecifier") {
          namespaces.push(name);
        } else {
          identifiers.push(name);
        }
      }

      const identifierCount = identifiers.length;
      if (identifierCount) {
        const lastIndex = identifierCount - 1;
        hoistedCode += this.generateLetDeclarations ? "let " : "var ";

        for (let i = 0; i < identifierCount; ++i) {
          const isLast = i === lastIndex;
          hoistedCode +=
            identifiers[i] +
            (isLast ? ";" : ",");
        }
      }

      const namespaceCount = namespaces.length;
      if (namespaceCount) {
        const lastIndex = namespaceCount - 1;
        hoistedCode += this.generateLetDeclarations ? "const " : "var ";

        for (let i = 0; i < namespaceCount; ++i) {
          const isLast = i === lastIndex;
          hoistedCode +=
            namespaces[i] +
            "=Object.create(null)" +
            (isLast ? ";" : ",");
        }
      }
    }

    hoistedCode += toModuleImport(
      this,
      getSourceString(this, decl),
      computeSpecifierMap(decl.specifiers),
      namespaces
    );

    hoistImports(this, path, hoistedCode);
  }

  visitExportAllDeclaration(path) {
    const decl = path.getValue();
    const hoistedCode = pad(
      this,
      this.moduleAlias + ".watch(require(" + getSourceString(this, decl) + ")",
      decl.start,
      decl.source.start
    ) + pad(
      this,
      ',{"*":function(v,k){exports[k]=v}},' +
        makeUniqueKey(this) + ");",
      decl.source.end,
      decl.end
    );

    hoistExports(this, path, hoistedCode);
  }

  visitExportDefaultDeclaration(path) {
    const decl = path.getValue();
    const dd = decl.declaration;

    if (dd.id && (dd.type === "FunctionDeclaration" ||
                  dd.type === "ClassDeclaration")) {
      // If the exported default value is a function or class declaration,
      // it's important that the declaration be visible to the rest of the
      // code in the exporting module, so we must avoid compiling it to a
      // named function or class expression.
      hoistExports(this, path, {
        "default": [dd.id.name]
      }, "declaration");

    } else {
      // Otherwise, since the exported value is an expression, we use the
      // special module.exportDefault(value) form.

      path.call(this.visitWithoutReset, "declaration");
      assert.strictEqual(decl.declaration, dd);

      let prefix = this.moduleAlias + ".exportDefault(";
      let suffix = ");";

      if (dd.type === "SequenceExpression") {
        // If the exported expression is a comma-separated sequence
        // expression, this.code.slice(dd.start, dd.end) may not include
        // the vital parentheses, so we should wrap the expression with
        // parentheses to make absolutely sure it is treated as a single
        // argument to the module.exportDefault method, rather than as
        // multiple arguments.
        prefix += "(";
        suffix = ")" + suffix;
      }

      overwrite(this, decl.start, dd.start, prefix);
      overwrite(this, dd.end, decl.end, suffix, true);

      if (this.modifyAST) {
        // A Function or Class declaration has become an expression on the
        // right side of the exportDefaultPrefix assignment above so
        // change the AST appropriately
        if (dd.type === "FunctionDeclaration") {
          dd.type = "FunctionExpression";
        } else if (dd.type === "ClassDeclaration") {
          dd.type = "ClassExpression";
        }

        // Almost every JS parser parses this expression the same way, but
        // we should still give custom parsers a chance to parse it.
        let ast = this.parse(this.moduleAlias + ".exportDefault(ARG);");
        if (ast.type === "File") ast = ast.program;
        assert.strictEqual(ast.type, "Program");

        const callExprStmt = ast.body[0];
        assert.strictEqual(callExprStmt.type, "ExpressionStatement");

        const callExpr = callExprStmt.expression;
        assert.strictEqual(callExpr.type, "CallExpression");

        // Replace the ARG identifier with the exported expression.
        callExpr.arguments[1] = dd;

        path.replace(callExprStmt);
      }

      this.madeChanges = true;
    }
  }

  visitExportNamedDeclaration(path) {
    const decl = path.getValue();
    const dd = decl.declaration;

    if (dd) {
      const specifierMap = Object.create(null);
      const type = dd.type;

      if (dd.id && (type === "ClassDeclaration" ||
                    type === "FunctionDeclaration")) {
        addNameToMap(specifierMap, dd.id.name);
      } else if (type === "VariableDeclaration") {
        const ddCount = dd.declarations.length;

        for (let i = 0; i < ddCount; ++i) {
          const names = utils.getNamesFromPattern(dd.declarations[i].id);
          const nameCount = names.length;

          for (let j = 0; j < nameCount; ++j) {
            addNameToMap(specifierMap, names[j]);
          }
        }
      }

      hoistExports(this, path, specifierMap, "declaration");

      if (canExportedValuesChange(decl)) {
        // We can skip adding declared names to this.exportedLocalNames if
        // the declaration was a const-kinded VariableDeclaration, because
        // the assignmentVisitor will not need to worry about changes to
        // these variables.
        addExportedLocalNames(this, specifierMap);
      }

      return;
    }

    if (decl.specifiers) {
      let specifierMap = computeSpecifierMap(decl.specifiers);

      if (decl.source) {
        if (specifierMap) {
          const newMap = Object.create(null);
          const keys = Object.keys(specifierMap);
          const keyCount = keys.length;

          for (let i = 0; i < keyCount; ++i) {
            const exported = keys[i];
            const locals = specifierMap[exported];
            const localCount = locals.length;

            for (let j = 0; j < localCount; ++j) {
              addToSpecifierMap(newMap, locals[j], "exports." + exported);
            }
          }

          specifierMap = newMap;
        }

        // Even though the compiled code uses module.watch, it should
        // still be hoisted as an export, i.e. before actual imports.
        hoistExports(this, path, toModuleImport(
          this,
          getSourceString(this, decl),
          specifierMap
        ));

      } else {
        hoistExports(this, path, specifierMap);
        addExportedLocalNames(this, specifierMap);
      }
    }
  }
};

function addExportedLocalNames(visitor, specifierMap) {
  const exportedLocalNames = visitor.exportedLocalNames;
  const keys = Object.keys(specifierMap);
  const keyCount = keys.length;

  for (let i = 0; i < keyCount; ++i) {
    const exported = keys[i];
    const locals = specifierMap[exported];
    const localCount = locals.length;

    for (let j = 0; j < localCount; ++j) {
      // It's tempting to record the exported name as the value here,
      // instead of true, but there can be more than one exported name
      // per local variable, and we don't actually use the exported
      // name(s) in the assignmentVisitor, so it's not worth the added
      // complexity of tracking unused information.
      exportedLocalNames[locals[j]] = true;
    }
  }
}

function addNameToMap(map, name) {
  addToSpecifierMap(map, name, name);
}

function addToSpecifierMap(map, __ported, local) {
  assert.strictEqual(typeof __ported, "string");
  assert.strictEqual(typeof local, "string");

  const locals = __ported in map ? map[__ported] : [];

  if (locals.indexOf(local) < 0) {
    locals.push(local);
  }

  map[__ported] = locals;

  return map;
}

// Returns a map from {im,ex}ported identifiers to lists of local variable
// names bound to those identifiers.
function computeSpecifierMap(specifiers) {
  const specifierCount = specifiers.length;
  const specifierMap = Object.create(null);

  for (let i = 0; i < specifierCount; ++i) {
    const s = specifiers[i];

    const local =
      s.type === "ExportDefaultSpecifier" ? "default" :
      s.type === "ExportNamespaceSpecifier" ? "*" :
      s.local.name;

    const __ported = // The IMported or EXported name.
      s.type === "ImportSpecifier" ? s.imported.name :
      s.type === "ImportDefaultSpecifier" ? "default" :
      s.type === "ImportNamespaceSpecifier" ? "*" :
      (s.type === "ExportSpecifier" ||
       s.type === "ExportDefaultSpecifier" ||
       s.type === "ExportNamespaceSpecifier") ? s.exported.name :
      null;

    if (typeof local === "string" && typeof __ported === "string") {
      addToSpecifierMap(specifierMap, __ported, local);
    }
  }

  return specifierMap;
}

function getBlockBodyInfo(visitor, path) {
  const node = path.getNode();
  let parent = path.getParentNode();

  if (parent === null) {
    parent = node;
  }

  let body = parent.body;
  let bodyName = "body";
  let insertCharIndex = node.start;
  let needToAddUseStrictDirective = false;

  switch (parent.type) {
  case "Program":
    insertCharIndex = parent.start;

    // If parent is a Program, we may need to add a "use strict"
    // directive to enable const/let in Node 4.
    needToAddUseStrictDirective = visitor.enforceStrictMode;
    break;

  case "BlockStatement":
    insertCharIndex = parent.start + 1;
    break;

  case "SwitchCase":
    body = parent.consequent;
    bodyName = "consequent";
    insertCharIndex = body[0].start;
    break;

  default:
    const block = {
      type: "BlockStatement",
      body: [],
      start: node.start,
      end: node.end + 2
    };

    body = block.body;
    bodyName = path.getName();
    insertCharIndex = node.start;

    if (visitor.magicString !== null) {
      visitor.magicString
        .appendLeft(insertCharIndex, "{")
        .prependRight(node.end, "}");
    }

    if (visitor.modifyAST) {
      path.replace(block);
    }
  }

  assert.ok(Array.isArray(body), body);

  // Avoid hoisting above string literal expression statements such as
  // "use strict", which may depend on occurring at the beginning of
  // their enclosing scopes.
  let insertNodeIndex = 0;
  const stmtCount = body.length;

  for (let i = 0; i < stmtCount; ++i) {
    const stmt = body[i];
    if (stmt.type === "ExpressionStatement") {
      const expr = stmt.expression;
      if (expr.type === "StringLiteral" ||
          (expr.type === "Literal" &&
          typeof expr.value === "string")) {
        insertCharIndex = stmt.end;
        insertNodeIndex = i + 1;
        if (expr.value === "use strict") {
          // If there's already a "use strict" directive, then we don't
          // need to add another one.
          needToAddUseStrictDirective = false;
        }
        continue;
      }
    }
    break;
  }

  // Babylon represents directives like "use strict" with a .directives
  // array property on the parent node.
  const directives = parent.directives;
  const directiveCount = directives ? directives.length : 0;

  for (let i = 0; i < directiveCount; ++i) {
    const d = directives[i];
    insertCharIndex = Math.max(d.end, insertCharIndex);
    if (d.value.value === "use strict") {
      // If there's already a "use strict" directive, then we don't
      // need to add another one.
      needToAddUseStrictDirective = false;
    }
  }

  let bibn = parent._bodyInfoByName;
  if (bibn === void 0) {
    bibn = parent._bodyInfoByName = Object.create(null);
  }

  let bodyInfo = bibn[bodyName];
  if (bodyInfo === void 0) {
    bodyInfo = bibn[bodyName] = Object.create(null);
    bodyInfo.body = body;
    bodyInfo.parent = parent;
    bodyInfo.insertCharIndex = insertCharIndex;
    bodyInfo.insertNodeIndex = insertNodeIndex;
    bodyInfo.hoistedExportsMap = Object.create(null);
    bodyInfo.hoistedConstExportsMap = Object.create(null);
    bodyInfo.hoistedExportsString = "";
    bodyInfo.hoistedImportsString = "";

    visitor.bodyInfos.push(bodyInfo);

  } else {
    assert.strictEqual(bodyInfo.body, body);
  }

  if (needToAddUseStrictDirective) {
    bodyInfo.needToAddUseStrictDirective = needToAddUseStrictDirective;
  }

  return bodyInfo;
}

// Gets a string representation (including quotes) from an import or
// export declaration node.
function getSourceString(visitor, decl) {
  const code = visitor.code;
  if (code) {
    return code.slice(
      decl.source.start,
      decl.source.end
    );
  }

  assert.strictEqual(typeof decl.source.value, "string");

  return JSON.stringify(decl.source.value);
}

function hoistImports(visitor, importDeclPath, hoistedCode) {
  preserveLine(visitor, importDeclPath);
  const bodyInfo = getBlockBodyInfo(visitor, importDeclPath);
  bodyInfo.hoistedImportsString += hoistedCode;
  visitor.madeChanges = true;
}

function hoistExports(visitor, exportDeclPath, mapOrString, childName) {
  if (childName) {
    preserveChild(visitor, exportDeclPath, childName);
  } else {
    preserveLine(visitor, exportDeclPath);
  }

  const bodyInfo = getBlockBodyInfo(visitor, exportDeclPath);
  const constant = ! canExportedValuesChange(exportDeclPath.getValue());

  if (typeof mapOrString !== "string") {
    const keys = Object.keys(mapOrString);
    const keyCount = keys.length;

    for (let i = 0; i < keyCount; ++i) {
      const exported = keys[i];
      const locals = mapOrString[exported];
      const localCount = locals.length;

      for (let j = 0; j < localCount; ++j) {
        addToSpecifierMap(
          constant
            ? bodyInfo.hoistedConstExportsMap
            : bodyInfo.hoistedExportsMap,
          exported,
          locals[j]
        );
      }
    }

  } else {
    bodyInfo.hoistedExportsString += mapOrString;
  }

  visitor.madeChanges = true;
}

function canExportedValuesChange(exportDecl) {
  if (exportDecl) {
    if (exportDecl.type === "ExportDefaultDeclaration") {
      const dd = exportDecl.declaration;
      return (dd.type === "FunctionDeclaration" ||
              dd.type === "ClassDeclaration");
    }

    if (exportDecl.type === "ExportNamedDeclaration") {
      const dd = exportDecl.declaration;
      if (dd &&
          dd.type === "VariableDeclaration" &&
          dd.kind === "const") {
        return false;
      }
    }
  }

  return true;
}

function makeUniqueKey(visitor) {
  return visitor.nextKey++;
}

function overwrite(visitor, oldStart, oldEnd, newCode, trailing) {
  if (! visitor.code) {
    return;
  }

  assert.strictEqual(typeof oldStart, "number");
  assert.strictEqual(typeof oldEnd, "number");
  assert.strictEqual(typeof newCode, "string");

  const padded = pad(visitor, newCode, oldStart, oldEnd);

  if (oldStart === oldEnd) {
    if (padded === "") {
      return;
    }

    if (trailing) {
      visitor.magicString.appendLeft(oldStart, padded);
    } else {
      visitor.magicString.prependRight(oldStart, padded);
    }

  } else {
    visitor.magicString.overwrite(oldStart, oldEnd, padded);
  }
}

function pad(visitor, newCode, oldStart, oldEnd) {
  const code = visitor.code;
  if (code) {
    const oldLines = code.slice(oldStart, oldEnd).split("\n");
    const oldLineCount = oldLines.length;
    const newLines = newCode.split("\n");
    const lastIndex = newLines.length - 1;

    for (let i = lastIndex; i < oldLineCount; ++i) {
      const oldLine = oldLines[i];
      const lastCharCode = oldLine.charCodeAt(oldLine.length - 1);
      if (i > lastIndex) {
        newLines[i] = "";
      }
      if (lastCharCode === codeOfCR) {
        newLines[i] += "\r";
      }
    }

    newCode = newLines.join("\n");
  }

  return newCode;
}

function preserveChild(visitor, path, childName) {
  const value = path.getValue();
  const child = value ? value[childName] : null;

  if (child && visitor.code) {
    overwrite(
      visitor,
      value.start,
      child.start,
      ""
    );
    overwrite(
      visitor,
      child.end,
      value.end,
      ""
    );
  }

  path.call(visitor.visitWithoutReset, childName);

  if (visitor.modifyAST) {
    // Replace the given path with the child we want to preserve.
    path.replace(child);
  }
}

function preserveLine(visitor, path) {
  const value = path.getValue();

  if (visitor.code) {
    overwrite(visitor, value.start, value.end, "");
  }

  if (visitor.modifyAST) {
    visitor.removals.push({
      name: path.getName(),
      parent: path.getParent(),
      value
    });
  }
}

function processRemoval(removal) {
  const parent = removal.parent;
  const value = removal.value;

  if (Array.isArray(parent)) {
    const index = parent.indexOf(value);
    if (index > -1) {
      parent.splice(index, 1);
    }
    return;
  }

  const newValue = parent[removal.name];

  if (newValue.type === "BlockStatement") {
    // This newValue is a BlockStatement that we created in the default
    // case of the switch statement in getBlockBodyInfo, so we make sure
    // the original import/export declaration is no longer in its .body.
    processRemoval({
      parent: newValue.body,
      value
    });
  }
}

function safeKey(key) {
  if (/^[_$a-zA-Z]\w*$/.test(key)) {
    return key;
  }
  return JSON.stringify(key);
}

function safeParam(param, locals) {
  if (locals.indexOf(param) < 0) {
    return param;
  }
  return safeParam("_" + param, locals);
}

function toModuleImport(visitor, source, specifierMap, namespaces) {
  let code = visitor.moduleAlias + ".watch(require(" + source + ")";
  const importedNames = Object.keys(specifierMap);
  const nameCount = importedNames.length;

  if (! nameCount) {
    code += ");";
    return code;
  }

  const lastIndex = nameCount - 1;
  let namespaceList = Array.isArray(namespaces) ? namespaces.join(",") : "";
  const searchExports = ! namespaceList;

  code += ",{";

  for (let i = 0; i < nameCount; ++i) {
    const imported = importedNames[i];
    const isLast = i === lastIndex;
    const locals = specifierMap[imported];
    const localCount = locals.length;
    const localLastIndex = localCount - 1;
    const valueParam = safeParam("v", locals);

    // Generate plain functions, instead of arrow functions, to avoid a perf
    // hit in Node 4.
    code +=
      safeKey(imported) +
      ":function(" + valueParam;

    if (imported === "*") {
      // When the imported name is "*", the setter function may be called
      // multiple times, and receives an additional parameter specifying
      // the name of the property to be set.
      const nameParam = safeParam("n", locals);
      code += "," + nameParam + "){";

      for (let j = 0; j < localCount; ++j) {
        const local = locals[j];

        if (searchExports && local.startsWith("exports.")) {
          code = locals[localLastIndex - j] + "=Object.create(null);" + code;
          namespaceList += (namespaceList ? "," : "") + local;
        }
        // The local variable should have been initialized as an empty
        // object when the variable was declared.
        code += local + "[" + nameParam + "]=";
      }
      code += valueParam;
    } else {
      // Multiple local variables become a compound assignment.
      code += "){" + locals.join("=") + "=" + valueParam;
    }

    code += "}";

    if (! isLast) {
      code += ",";
    }
  }

  code += "}," + makeUniqueKey(visitor);

  if (namespaceList) {
    code += ",[" + namespaceList + "]";
  }

  code += ");";

  return code;
}

function toModuleExport(visitor, specifierMap, constant) {
  let code = "";
  const exportedKeys = Object.keys(specifierMap);
  const keyCount = exportedKeys.length;

  if (! keyCount) {
    return code;
  }

  const lastIndex = keyCount - 1;
  code += visitor.moduleAlias + ".export({";

  for (let i = 0; i < keyCount; ++i) {
    const exported = exportedKeys[i];
    const isLast = i === lastIndex;
    const locals = specifierMap[exported];

    assert.strictEqual(locals.length, 1);

    code += exported + ":";

    if (visitor.generateArrowFunctions) {
      code += "()=>" + locals[0];
    } else {
      code += "function(){return " + locals[0] + "}";
    }

    if (! isLast) {
      code += ",";
    }
  }

  // The second argument to module.export indicates whether the getter
  // functions provided in the first argument are constant or not.
  code += constant ? "},true);" : "});";

  return code;
}

module.exports = ImportExportVisitor;
