# WASM

https://github.com/stephenostermiller/qqwing/pull/16

Steps to compile to WASM to run from Node.js This is likely faster than the js
version.

Install emscripten.org
https://emscripten.org/docs/getting_started/downloads.html

Download C++ source from https://qqwing.com/download.html

Run `./configure`

edit `main.cpp` add to top

```
#include <stdio.h>
#include <emscripten.h>
```

Add `EMSCRIPTEN_KEEPALIVE` above int main so it looks like

```
EMSCRIPTEN_KEEPALIVE
int main(int argc, char *argv[]){
```

Run
`emcc main.cpp qqwing.cpp -o main.js -sMODULARIZE -sEXPORTED_RUNTIME_METHODS=ccall,callMain -sINVOKE_RUN=0`

This outputs main.js and main.wasm

Create an index.js file like the following

```
var factory = require('./main.js');
factory({
  print: (x) => {
    // Change to capture output
    console.info(x);
  }
}).then((instance) => {
  instance.callMain(['--version']);
  instance.callMain(['--generate']);
  instance.callMain(['--generate', '--difficulty', 'expert', '--solution', '--csv']);
});
```

Run `node index.js`

This outputs

```
qqwing 1.3.4
 . . . | . 7 2 | 1 . .
 . . . | 8 . . | . . 9
 . . . | . 3 . | 8 2 .
-------|-------|-------
 . 9 . | 2 . . | . . .
 8 2 . | . 1 . | . . .
 . . . | . . . | 3 . .
-------|-------|-------
 3 6 . | . 8 . | . . .
 . . . | . 2 1 | 5 . .
 . . 9 | 5 . . | . . 6
Puzzle,Solution,
....721.....8....9....3.82..9.2.....82..1..........3..36..8........215....95....6,486972135132854679957136824593267418824315967671498352365789241748621593219543786,
```

We can change the print method to capture it to a variable instead of console.
