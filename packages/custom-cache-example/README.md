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
a2f2d6b8b16ddbc496993cb55f3621f5fe4e5f1a.js

% cat .reify-custom-cache/a2f2d6b8b16ddbc496993cb55f3621f5fe4e5f1a.js
module.export({name:()=>name});var basename;module.import("path",{basename(v){basename=v}},0);
var name = basename(module.id);
```
