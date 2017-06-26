var fs = require('fs');
var TGA = require('../index');

var fileBuffer = fs.readFileSync('./test.tga');

console.time('parse tga');
var tga = new TGA(fileBuffer);
console.timeEnd('parse tga');
console.log('tga info:', tga.width, tga.height);