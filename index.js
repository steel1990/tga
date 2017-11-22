const debug = require('debug')('TGA');

// doc: http://paulbourke.net/dataformats/tga/
class TGA {
    constructor(buffer, opt) {
        debug('constructor');
        opt = Object.assign({ isFlipY: true }, opt);
        this.buffer = buffer;
        this.isFlipY = opt.isFlipY;
        this.parse();
    }
    static createTgaBuffer(width, height, pixels, dontFlipY) {
        debug('createTgaBuffer');
        var buffer = Buffer.alloc(18 + pixels.length);
        // write header
        buffer.writeInt8(0, 0);
        buffer.writeInt8(0, 1);
        buffer.writeInt8(2, 2);
        buffer.writeInt16LE(0, 3);
        buffer.writeInt16LE(0, 5);
        buffer.writeInt8(0, 7);
        buffer.writeInt16LE(0, 8);
        buffer.writeInt16LE(0, 10);
        buffer.writeInt16LE(width, 12);
        buffer.writeInt16LE(height, 14);
        buffer.writeInt8(32, 16);
        buffer.writeInt8(0, 17);

        var offset = 18;
        for (var i = 0; i < height; i++) {
            for (var j = 0; j < width; j++) {
                var idx = ((dontFlipY ? i : height - i - 1) * width + j) * 4;
                buffer.writeUInt8(pixels[idx + 2], offset++);    // b
                buffer.writeUInt8(pixels[idx + 1], offset++);    // g
                buffer.writeUInt8(pixels[idx], offset++);        // r
                buffer.writeUInt8(pixels[idx + 3], offset++);    // a
            }
        }

        return buffer;
    }
    static getHeader(buffer) {
        debug('getHeader');
        var header = {};
        header.idlength = buffer.readInt8(0);
        header.colourMapType = buffer.readInt8(1);
        header.dataTypeCode = buffer.readInt8(2);
        header.colourMapOrigin = buffer.readInt16LE(3);
        header.colourMapLength = buffer.readInt16LE(5);
        header.colourMapDepth = buffer.readInt8(7);
        header.xOrigin = buffer.readInt16LE(8);
        header.yOrigin = buffer.readInt16LE(10);
        header.width = buffer.readInt16LE(12);
        header.height = buffer.readInt16LE(14);
        header.bitsPerPixel = buffer.readInt8(16);
        header.imageDescriptor = buffer.readInt8(17);
        debug('getHeader', header);
        return header;
    }
    parse() {
        debug('parse');
        this.header = this.readHeader();
        if (!this.check()) {
            return;
        }
        this.readPixels();
    }
    readHeader() {
        debug('readHeader');
        var header = TGA.getHeader(this.buffer);
        this.width = header.width;
        this.height = header.height;
        this.bytesPerPixel = header.bytesPerPixel = header.bitsPerPixel / 8;
        debug('readHeader', header);
        return header;
    }
    check() {
        debug('check tga file');
        var header = this.header;
        /* What can we handle */
        if (header.dataTypeCode != 2 && header.dataTypeCode != 10) {
            console.error('Can only handle image type 2 and 10');
            return false;
        }
        if (header.bitsPerPixel != 16 && 
            header.bitsPerPixel != 24 && header.bitsPerPixel != 32) {
            console.error('Can only handle pixel depths of 16, 24, and 32');
            return false;
        }
        if (header.colourMapType != 0 && header.colourMapType != 1) {
            console.error('Can only handle colour map types of 0 and 1');
            return false;
        }
        return true;
    }
    addPixel(arr, offset, idx) {
        if (this.isFlipY) {
            var y = this.height - 1 - Math.floor(idx / this.width);
            idx = y * this.width + idx % this.width;
        }
        idx *= 4;
        var count = this.bytesPerPixel;
        var r = 255;
        var g = 255;
        var b = 255;
        var a = 255;
        if (count === 3 || count === 4) {
            r = arr[offset + 2];
            g = arr[offset + 1];
            b = arr[offset];
            a = count === 4 ? arr[offset + 3] : 255;
        } else if (count === 2) {
            r = (arr[offset + 1] & 0x7c) << 1;
            g = ((arr[offset + 1] & 0x03) << 6) | ((arr[offset] & 0xe0) >> 2);
            b = (arr[offset] & 0x1f) << 3;
            a = (arr[offset + 1] & 0x80);
        } else {
            console.error('cant transform to Pixel');
        }

        this.pixels[idx] = r;
        this.pixels[idx + 1] = g;
        this.pixels[idx + 2] = b;
        this.pixels[idx + 3] = a;
    }
    readPixels() {
        debug('readPixels');
        var header = this.header;
        var bytesPerPixel = header.bytesPerPixel;
        var pixelCount = header.width * header.height;
        var data = new Uint8Array(this.buffer);
        this.pixels = new Uint8Array(pixelCount * 4);
        var offset = 18;

        for (var i = 0; i < pixelCount; i++) {
            if (header.dataTypeCode === 2) {
                this.addPixel(data, offset, i);
            } else if (header.dataTypeCode === 10) {
                var flag = data[offset++];
                var count = flag & 0x7f;
                var isRLEChunk = flag & 0x80;
                this.addPixel(data, offset, i);
                for (var j = 0; j < count; j++) {
                    if (!isRLEChunk) {
                        offset += this.bytesPerPixel;
                    }
                    this.addPixel(data, offset, ++i);
                }
            }
            offset += this.bytesPerPixel;
        }
    }
}

module.exports = TGA;