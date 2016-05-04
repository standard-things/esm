var hasOwn = Object.prototype.hasOwnProperty;
var settersMap = Object.create(null);
var setterUtils = require("./setter-utils.js");

function Entry(id) {
  this.id = id;
  this.runCount = 0;
  this.parents = Object.create(null);
  this.setters = Object.create(null);
}

var Ep = Entry.prototype;

Entry.getOrCreate = function (id) {
  return settersMap[id] = settersMap[id] || new Entry(id);
};

Ep.addSetters = function (setters) {
  Object.keys(setters).forEach(function (name) {
    this.addSetter(name, setters[name]);
  }, this);
};

Ep.addSetter = function (name, setter) {
  (this.setters[name] =
   this.setters[name] || []
  ).push(setter);
};

Ep.addParent = function (module) {
  this.parents[module.id] = module;
};

Entry.runModuleSetters = function (module) {
  var entry = settersMap[module.id];
  if (entry) {
    entry.runModuleSetters(module);
  }
};

Ep.runModuleSetters = function (module) {
  var entry = this;
  var shouldRunParentSetters = false;

  Object.keys(entry.setters).forEach(function (name) {
    var value = module.getExportByName(name);

    entry.setters[name].forEach(function (setter) {
      if (typeof setter === "function" &&
          ! (hasOwn.call(setter, "last") &&
             value === setter.last)) {
        var result = setter.call(
          setterUtils,
          setter.last = value
        );

        if (result === true) {
          shouldRunParentSetters = true;
        }
      }
    });
  });

  if (shouldRunParentSetters) {
    entry.runParentSetters();
  }
};

Ep.runParentSetters = function () {
  var parents = this.parents;
  Object.keys(parents).forEach(function (id) {
    Entry.runModuleSetters(parents[id]);
  });
};

exports.Entry = Entry;
