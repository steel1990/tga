var fs = require('fs-extra');
const path = require('path');
var TGA = require('../src');

const basePath = path.resolve(__dirname, '../testFiles');

function convertToPNG(src, dest) {
    var fileBuffer = fs.readFileSync(src);

    console.time('parse tga');
    var tga = new TGA(fileBuffer);
    console.timeEnd('parse tga');
    console.log('tga info:', tga.width, tga.height);

    // var buf = TGA.createTgaBuffer(tga.width, tga.height, tga.pixels);
    // fs.writeFileSync(path.join(basePath, 'out.tga'), buf);

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



const list = fs.readdirSync(basePath);

// const list = ['xing_b32.tga'];

list.filter(f => f.endsWith('.tga')).forEach((file) => {
    console.log('hander for %s', file);
    convertToPNG(path.join(basePath, file), path.join(basePath, file + '.png'));
})