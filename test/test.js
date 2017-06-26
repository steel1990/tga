var fs = require('fs');
var TGA = require('../index');

var fileBuffer = fs.readFileSync('./test.tga');

console.time('parse tga');
var tga = new TGA(fileBuffer);
console.timeEnd('parse tga');
console.log('tga info:', tga.width, tga.height);

var buf = TGA.createTgaBuffer(tga.width, tga.height, tga.pixels);
fs.writeFileSync('./out.tga', buf);

console.time('topng');
var PNG = require('pngjs').PNG;
var png = new PNG({
    width: tga.width,
    height: tga.height
});
png.data = tga.pixels;
png.pack().pipe(fs.createWriteStream('./test.png'));
console.timeEnd('topng');