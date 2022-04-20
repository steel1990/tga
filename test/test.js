var fs = require('fs');
const path = require('path');
var TGA = require('../index');

function convertToPNG(src, dest) {
    var fileBuffer = fs.readFileSync(src);

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
    png.pack().pipe(fs.createWriteStream(dest));
    console.timeEnd('topng');
}

const list = [
    'flag_b16.tga',
    'flag_b24.tga',
    'flag_b32.tga',
    'flag_t16.tga',
    'flag_t24.tga',
    'flag_t32.tga',
    'xing_b16.tga',
    'xing_b24.tga',
    'xing_b32.tga',
    'xing_t16.tga',
    'xing_t24.tga',
    'xing_t32.tga',
    'shuttle.tga',
    'fern.tga',
    'football_seal.tga',
    'earth.tga',
    'test.tga',
];

list.forEach((file) => {
    convertToPNG(path.join(__dirname, file), path.join(__dirname, file + '.png'));
})