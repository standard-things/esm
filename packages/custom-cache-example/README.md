# `custom-cache-example`

Example package using a different cache directory than the default:
`packages/custom-cache-example/.reify-custom-cache` instead of
`.reify-cache`.

## Installation

```sh
cd packages/babylon-example
npm install
```

## Usage

```js
> require("./index.js")
{ __esModule: true, name: "module.js" }
> .exit
```

then

```sh
% ls .reify-custom-cache
a2f2d6b8b16ddbc496993cb55f3621f5fe4e5f1a.json

% cat .reify-custom-cache/a2f2d6b8b16ddbc496993cb55f3621f5fe4e5f1a.json
module.export({name:function(){return name}});var basename;module.import("path",{"basename":function(v){basename=v}},0);
var name = basename(module.id);
```
