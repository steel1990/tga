var fs = require('fs');
const path = require('path');
var TGA = require('../src/parser');

function convertToPNG(src, dest) {
    var fileBuffer = fs.readFileSync(src);

    console.time('parse tga');
    var tga = new TGA(fileBuffer);
    console.timeEnd('parse tga');
    console.log('tga info:', tga.width, tga.height);

    // var buf = TGA.createTgaBuffer(tga.width, tga.height, tga.pixels);
    // fs.writeFileSync('./out.tga', buf);

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
    // 'flag_b16.tga',
    // 'flag_b24.tga',
    // 'flag_b32.tga',
    // 'flag_t16.tga',
    // 'flag_t24.tga',
    // 'flag_t32.tga',
    // 'xing_b16.tga',
    // 'xing_b24.tga',
    // 'xing_b32.tga',
    // 'xing_t16.tga',
    // 'xing_t24.tga',
    // 'xing_t32.tga',
    // 'shuttle.tga',
    // 'fern.tga',
    // 'football_seal.tga',
    // 'earth.tga',
    // 'test.tga',

    'cbw8.tga',
    // 'ccm8.tga',
    // 'ctc16.tga',
    // 'ctc24.tga',
    // 'ctc32.tga',
    // 'monochrome16_top_left.tga',
    // 'monochrome16_top_left_rle.tga',
    // 'monochrome8_bottom_left.tga',
    // 'monochrome8_bottom_left_rle.tga',
    // 'rgb24_bottom_left_rle.tga',
    // 'rgb24_top_left.tga',
    // 'rgb24_top_left_colormap.tga',
    // 'rgb32_bottom_left.tga',
    // 'rgb32_top_left_rle.tga',
    // 'rgb32_top_left_rle_colormap.tga',
    // 'ubw8.tga',
    // 'ucm8.tga',
    // 'utc16.tga',
    // 'utc24.tga',
    // 'utc32.tga',
];

list.forEach((file) => {
    convertToPNG(path.resolve(__dirname, '../testFiles', file), path.resolve(__dirname, '../testFiles', file + '.png'));
})