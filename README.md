TGA
========
This is a pure Node.js module for parse or write tga image file.

Requirements
========
* Node.js v6

Installation
========
```
$ npm install tga --save
```

API
========
### Class TGA(buffer)
buffer is the tga file Buffer(fs.readFile).

### TGA.createTgaBuffer(width, height, pixels)
* width: image width
* height: image height
* pixels(Array): the image pixels data
    * r: [0, 255] Red
    * g: [0, 255] Green
    * b: [0, 255] Blue
    * a: [0, 255] Alpha

In tga image file, the bottom goes before top, maybe you should flip by Y to use;

### TGA.prototype.getPixelsBuffer()
Get the tga file's pixels data Buffer, it will fily Y coordinate, the format is:
`[r, g, b, a, r, g, b, a...]`
You can send the buffer to `pngjs`.

Example
========
```js
var fs = require('fs');
var TGA = require('tga');
var tga = new TGA(fs.readFileSync('./x.tga'));
console.log(tga.width, tga.height);
for (var i = 0; i < tga.pixels.length; i++) {
    // the range of r, g, b and a is [0, 255]
    console.log(tga.pixels[i].r, tga.pixels[i].g, tga.pixels[i].b, tga.pixels[i].a);
}

// save as another tga image
var buf = TGA.createTgaBuffer(tga.width, tga.height, tga.pixels);
fs.writeFileSync('./out.tga', buf);

// save the tga as png
var PNG = require('pngjs');
var png = new PNG({
    width: tga.header.width,
    height: tga.header.height
});
png.data = tga.getPixelsBuffer();
png.pack().pipe(fs.createWriteStream('./out.png'));

```