const r = require('restructure');

exports.tga = new r.Struct({
    idLength: r.uint8,
    colorMapType: r.uint8,
    dataType: r.uint8,
    colorMapOrigin: r.uint16le,
    colorMapLength: r.uint16le,
    colorMapDepth: r.uint8,
    xOrigin: r.uint16le,
    yOrigin: r.uint16le,
    width: r.uint16le,
    height: r.uint16le,
    bitsPerPixel: r.uint8,
    flags: r.uint8,
    id: new r.String('idLength', 'ascii'),
});