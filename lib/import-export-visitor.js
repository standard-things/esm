"use strict";

const assert = require("assert");
const getOption = require("./options.js").get;
const MagicString = require("./magic-string.js");
const utils = require("./utils.js");
const Visitor = require("./visitor.js");

const carriageReturnCode = "\r".charCodeAt(0);
const exportDefaultPrefix = 'module.export("default",exports.default=(';
const exportDefaultSuffix = "));";
const hasOwn = Object.prototype.hasOwnProperty;

module.exports = class ImportExportVisitor extends Visitor {
  finalizeHoisting() {
    const infoCount = this.bodyInfos.length;

    for (let i = 0; i < infoCount; ++i) {
      const bodyInfo = this.bodyInfos[i];
      const parts = [];

      // We don't need to add a "use strict" directive unless the compiler
      // made any changes.
      if (this.madeChanges &&
          bodyInfo.needToAddUseStrictDirective) {
        parts.push('"use strict";');
      }

      const namedExports = toModuleExport(bodyInfo.hoistedExportsMap);
      if (namedExports) {
        parts.push(namedExports);
      }

      if (bodyInfo.hoistedExportsString) {
        parts.push(bodyInfo.hoistedExportsString);
      }

      if (bodyInfo.hoistedImportsString) {
        parts.push(bodyInfo.hoistedImportsString);
      }

      if (parts.length) {
        const codeToInsert = parts.join("");

        if (this.magicString) {
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

      bodyInfo.body = null;
      bodyInfo.parent = null;
      bodyInfo.hoistedExportsMap = null;
      bodyInfo.hoistedExportsString = null;
      bodyInfo.hoistedImportsString = null;
      bodyInfo.insertCharIndex = null;
      bodyInfo.insertNodeIndex = null;
      bodyInfo.needToAddUseStrictDirective = null;
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
    this.removals = [];
    this.exportedLocalNames = Object.create(null);
    this.generateLetDeclarations =
      !! getOption(options, "generateLetDeclarations");
    this.modifyAST = !! getOption(options, "ast");
    this.parse = getOption(options, "parse");
    this.enforceStrictMode = getOption(options, "enforceStrictMode");
    this.nextKey = 0;
    this.madeChanges = false;
  }

  visitProgram(path) {
    this.visitChildren(path);
    const program = path.getNode();
    if (program.body.length > 0) {
      path.call(
        firstStmtPath => this._getBlockBodyInfo(firstStmtPath),
        "body", 0
      );
    } else {
      this._getBlockBodyInfo(path);
    }
  }

  visitImportDeclaration(path) {
    const decl = path.getValue();
    const specifierCount = decl.specifiers.length;
    const parts = [];

    if (specifierCount) {
      const identifiers = [];
      const namespaces = [];

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
        parts.push(this.generateLetDeclarations ? "let " : "var ");

        for (let i = 0; i < identifierCount; ++i) {
          const isLast = i === lastIndex;
          parts.push(
            identifiers[i],
            isLast ? ";" : ","
          );
        }
      }

      const namespaceCount = namespaces.length;
      if (namespaceCount) {
        const lastIndex = namespaceCount - 1;
        parts.push(this.generateLetDeclarations ? "const " : "var ");

        for (let i = 0; i < namespaceCount; ++i) {
          const isLast = i === lastIndex;
          parts.push(
            namespaces[i],
            "=Object.create(null)",
            isLast ? ";" : ","
          );
        }
      }
    }

    parts.push(toModuleImport(
      this._getSourceString(decl),
      computeSpecifierMap(decl.specifiers),
      this._makeUniqueKey()
    ));

    this._hoistImports(path, parts.join(""));
  }

  visitExportAllDeclaration(path) {
    const decl = path.getValue();
    const parts = [
      this._pad("module.importSync(", decl.start, decl.source.start),
      this._getSourceString(decl),
      this._pad(
        ',{"*":function(v,k){exports[k]=v}},' +
          this._makeUniqueKey() + ");",
        decl.source.end,
        decl.end
      )
    ];

    this._hoistExports(path, parts.join(""));
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
      this._hoistExports(path, {
        "default": [dd.id.name]
      }, "declaration");

    } else {
      // Otherwise, since the exported value is an expression, it's
      // important that we wrap it with parentheses, in case it's something
      // like a comma-separated sequence expression.
      this._overwrite(decl.start, dd.start, exportDefaultPrefix);

      path.call(this.visitWithoutReset, "declaration");
      assert.strictEqual(decl.declaration, dd);

      this._overwrite(dd.end, decl.end, exportDefaultSuffix, true);

      if (this.modifyAST) {
        // A Function or Class declaration has become an expression on the
        // right side of the _exportDefaultPrefix assignment above so change
        // the AST appropriately
        if (dd.type === "FunctionDeclaration") {
          dd.type = "FunctionExpression";
        } else if (dd.type === "ClassDeclaration") {
          dd.type = "ClassExpression";
        }

        path.replace(this._buildExportDefaultStatement(dd));
      }

      this.madeChanges = true;
    }
  }

  visitExportNamedDeclaration(path) {
    const decl = path.getValue();
    const dd = decl.declaration;

    if (dd) {
      const specifierMap = Object.create(null);
      const addNameToMap = function (name) {
        addToSpecifierMap(specifierMap, name, name);
      };

      if (dd.id && (dd.type === "ClassDeclaration" ||
                    dd.type === "FunctionDeclaration")) {
        addNameToMap(dd.id.name);
      } else if (dd.type === "VariableDeclaration") {
        const ddCount = dd.declarations.length;

        for (let i = 0; i < ddCount; ++i) {
          const names = utils.getNamesFromPattern(dd.declarations[i].id);
          const nameCount = names.length;

          for (let j = 0; j < nameCount; ++j) {
            addNameToMap(names[j]);
          }
        }
      }

      this._hoistExports(path, specifierMap, "declaration");
      this._addExportedLocalNames(specifierMap);

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

        // Even though the compiled code uses module.importSync, it should
        // still be hoisted as an export, i.e. before actual imports.
        this._hoistExports(path, toModuleImport(
          this._getSourceString(decl),
          specifierMap,
          this._makeUniqueKey()
        ));

      } else {
        this._hoistExports(path, specifierMap);
        this._addExportedLocalNames(specifierMap);
      }
    }
  }

  _addExportedLocalNames(specifierMap) {
    const exportedLocalNames = this.exportedLocalNames;
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

  _buildExportDefaultStatement(declaration) {
    let ast = this.parse(exportDefaultPrefix + "VALUE" + exportDefaultSuffix);

    if (ast.type === "File") {
      ast = ast.program;
    }

    assert.strictEqual(ast.type, "Program");

    const stmt = ast.body[0];
    assert.strictEqual(stmt.type, "ExpressionStatement");
    assert.strictEqual(stmt.expression.type, "CallExpression");

    const arg1 = stmt.expression.arguments[1];
    assert.strictEqual(arg1.right.type, "Identifier");
    assert.strictEqual(arg1.right.name, "VALUE");

    // Replace the VALUE identifier with the desired declaration.
    arg1.right = declaration;

    return stmt;
  }

  _getBlockBodyInfo(path) {
    const node = path.getNode();
    const parent = path.getParentNode() || node;

    let needToAddUseStrictDirective = false;
    let insertCharIndex = node.start;
    let bodyName = "body";
    let body;

    switch (parent.type) {
    case "Program":
      body = parent.body;
      insertCharIndex = parent.start;

      // If parent is a Program, we may need to add a "use strict"
      // directive to enable const/let in Node 4.
      needToAddUseStrictDirective = this.enforceStrictMode;

      break;

    case "BlockStatement":
      body = parent.body;

      if (hasOwn.call(parent, "start")) {
        insertCharIndex = parent.start + 1;
      } else {
        insertCharIndex = body[0].start;
      }
      break;

    case "SwitchCase":
      bodyName = "consequent";
      body = parent.consequent;
      insertCharIndex = body[0].start;
      break;

    default:
      bodyName = path.getName();

      const block = {
        type: "BlockStatement",
        body: []
      };

      body = block.body;

      insertCharIndex = node.start;

      if (this.magicString) {
        this.magicString
          .appendLeft(insertCharIndex, "{")
          .prependRight(node.end, "}");
      }

      if (this.modifyAST) {
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

    const bibn = parent._bodyInfoByName =
      parent._bodyInfoByName || Object.create(null);

    let bodyInfo = bibn[bodyName];
    if (bodyInfo) {
      assert.strictEqual(bodyInfo.body, body);

    } else {
      bodyInfo = bibn[bodyName] = Object.create(null);

      bodyInfo.body = body;
      bodyInfo.parent = parent;
      bodyInfo.insertCharIndex = insertCharIndex;
      bodyInfo.insertNodeIndex = insertNodeIndex;
      bodyInfo.hoistedExportsMap = Object.create(null);
      bodyInfo.hoistedExportsString = "";
      bodyInfo.hoistedImportsString = "";

      this.bodyInfos.push(bodyInfo);
    }

    bodyInfo.needToAddUseStrictDirective =
      needToAddUseStrictDirective ||
      bodyInfo.needToAddUseStrictDirective;

    return bodyInfo;
  }

  // Gets a string representation (including quotes) from an import or
  // export declaration node.
  _getSourceString(decl) {
    if (this.code) {
      return this.code.slice(
        decl.source.start,
        decl.source.end
      );
    }

    assert.strictEqual(typeof decl.source.value, "string");

    return JSON.stringify(decl.source.value);
  }

  _hoistImports(importDeclPath, hoistedCode) {
    this._preserveLine(importDeclPath);
    const bodyInfo = this._getBlockBodyInfo(importDeclPath);
    bodyInfo.hoistedImportsString += hoistedCode;
    this.madeChanges = true;
  }

  _hoistExports(exportDeclPath, mapOrString, childName) {
    if (childName) {
      this._preserveChild(exportDeclPath, childName);
    } else {
      this._preserveLine(exportDeclPath);
    }

    const bodyInfo = this._getBlockBodyInfo(exportDeclPath);

    if (typeof mapOrString !== "string") {
      const keys = Object.keys(mapOrString);
      const keyCount = keys.length;

      for (let i = 0; i < keyCount; ++i) {
        const exported = keys[i];
        const locals = mapOrString[exported];
        const localCount = locals.length;

        for (let j = 0; j < localCount; ++j) {
          addToSpecifierMap(
            bodyInfo.hoistedExportsMap,
            exported,
            locals[j]
          );
        }
      }

    } else {
      bodyInfo.hoistedExportsString += mapOrString;
    }

    this.madeChanges = true;
  }

  _makeUniqueKey() {
    return this.nextKey++;
  }

  _overwrite(oldStart, oldEnd, newCode, trailing) {
    if (! this.code) {
      return;
    }

    assert.strictEqual(typeof oldStart, "number");
    assert.strictEqual(typeof oldEnd, "number");
    assert.strictEqual(typeof newCode, "string");

    const padded = this._pad(newCode, oldStart, oldEnd);

    if (oldStart === oldEnd) {
      if (padded === "") {
        return this;
      }

      if (trailing) {
        this.magicString.appendLeft(oldStart, padded);
      } else {
        this.magicString.prependRight(oldStart, padded);
      }

    } else {
      this.magicString.overwrite(oldStart, oldEnd, padded);
    }
  }

  _pad(newCode, oldStart, oldEnd) {
    if (this.code) {
      const oldLines = this.code.slice(oldStart, oldEnd).split("\n");
      const oldLineCount = oldLines.length;
      const newLines = newCode.split("\n");

      for (let i = newLines.length - 1; i < oldLineCount; ++i) {
        const oldLine = oldLines[i];
        const lastCharCode = oldLine.charCodeAt(oldLine.length - 1);
        newLines[i] = newLines[i] || "";
        if (lastCharCode === carriageReturnCode) {
          newLines[i] += "\r";
        }
      }

      newCode = newLines.join("\n");
    }

    return newCode;
  }

  _preserveChild(path, childName) {
    const value = path.getValue();
    const child = value ? value[childName] : null;

    if (child && this.code) {
      this._overwrite(
        value.start,
        child.start,
        ""
      );
      this._overwrite(
        child.end,
        value.end,
        ""
      );
    }

    path.call(this.visitWithoutReset, childName);

    if (this.modifyAST) {
      // Replace the given path with the child we want to preserve.
      path.replace(child);
    }
  }

  _preserveLine(path) {
    const value = path.getValue();

    if (this.code) {
      this._overwrite(value.start, value.end, "");
    }

    if (this.modifyAST) {
      this.removals.push({
        container: path.getContainer(),
        name: path.getName(),
        value: value
      });
    }
  }
};

function addToSpecifierMap(map, __ported, local) {
  assert.strictEqual(typeof __ported, "string");
  assert.strictEqual(typeof local, "string");

  const locals = map[__ported] || [];

  if (locals.indexOf(local) < 0) {
    locals.push(local);
  }

  map[__ported] = locals;

  return map;
}

// Returns a map from {im,ex}ported identifiers to lists of local variable
// names bound to those identifiers.
function computeSpecifierMap(specifiers) {
  let specifierMap;
  const specifierCount = specifiers.length;

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

    if (typeof local !== "string" ||
        typeof __ported !== "string") {
      return;
    }

    specifierMap = addToSpecifierMap(
      specifierMap || Object.create(null),
      __ported,
      local
    );
  }

  return specifierMap;
}

function processRemoval(removal) {
  if (Array.isArray(removal.container)) {
    const index = removal.container.indexOf(removal.value);
    if (index >= 0) {
      removal.container.splice(index, 1);
    }
  } else if (removal.value ===
             removal.container[removal.name]) {
    // This case is almost certainly never reached.
    removal.container[removal.name] = null;
  } else {
    const newValue = removal.container[removal.name];
    if (newValue.type === "BlockStatement") {
      // This newValue is a BlockStatement that we created in the default
      // case of the switch statement in getBlockBodyInfo, so we make sure
      // the original import/export declaration is no longer in its .body.
      processRemoval({
        container: newValue.body,
        value: removal.value
      });
    }
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

function toModuleImport(source, specifierMap, uniqueKey) {
  const parts = ["module.importSync(", source];
  const importedNames = specifierMap ? Object.keys(specifierMap) : null;
  const nameCount = importedNames ? importedNames.length : 0;

  if (nameCount === 0) {
    parts.push(");");
    return parts.join("");
  }

  parts.push(",{");

  const lastIndex = nameCount - 1;

  for (let i = 0; i < nameCount; ++i) {
    const imported = importedNames[i];
    const isLast = i === lastIndex;
    const locals = specifierMap[imported];
    const valueParam = safeParam("v", locals);

    // Generate plain functions, instead of arrow functions, to avoid a perf
    // hit in Node 4.
    parts.push(
      safeKey(imported),
      ":function(", valueParam
    );

    if (imported === "*") {
      // There can be only one namespace import/export specifier.
      assert.strictEqual(locals.length, 1);
      const local = locals[0];

      if (local.startsWith("exports.")) {
        parts.unshift(`${local}=Object.create(null);`);
      }
      // When the imported name is "*", the setter function may be called
      // multiple times, and receives an additional parameter specifying
      // the name of the property to be set.
      const nameParam = safeParam("n", [local, valueParam]);

      parts.push(
        ",", nameParam, "){",
        // The local variable should have been initialized as an empty
        // object when the variable was declared.
        local, "[", nameParam, "]=", valueParam
      );

    } else {
      // Multiple local variables become a compound assignment.
      parts.push("){", locals.join("="), "=", valueParam);
    }

    parts.push("}");

    if (! isLast) {
      parts.push(",");
    }
  }

  parts.push("}," + uniqueKey + ");");

  return parts.join("");
}

function toModuleExport(specifierMap) {
  const exportedKeys = specifierMap ? Object.keys(specifierMap) : null;
  const keyCount = exportedKeys ? exportedKeys.length : 0;

  if (keyCount === 0) {
    return "";
  }

  const parts = ["module.export({"];
  const lastIndex = keyCount - 1;

  for (let i = 0; i < keyCount; ++i) {
    const exported = exportedKeys[i];
    const isLast = i === lastIndex;
    const locals = specifierMap[exported];

    assert.strictEqual(locals.length, 1);

    parts.push(
      exported,
      ":()=>",
      locals[0],
      isLast ? "" : ","
    );
  }

  parts.push("});");

  return parts.join("");
}
