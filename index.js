const debug = require('debug')('TGA');
const SmartBuffer = require('smart-buffer').SmartBuffer;

// doc: http://paulbourke.net/dataformats/tga/
class Pixel {
    constructor(r, g, b, a) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a === undefined ? 255 : a;
    }
    static from(nums) {
        if (nums instanceof Buffer) {
            nums = new Uint8Array(nums);
        }
        var count = nums.length;
        if (count === 3 || count === 4) {
            return new Pixel(nums[2], nums[1], nums[0], nums[3]);
        } else if (count === 2) {
            var r = (nums[1] & 0x7c) << 1;
            var g = ((nums[1] & 0x03) << 6) | ((nums[0] & 0xe0) >> 2);
            var b = (nums[0] & 0x1f) << 3;
            var a = (nums[1] & 0x80);
            return new Pixel(r, g, b, a);
        } else {
            console.error('cant transform to Pixel');
        }
    }
}

class TGA {
    constructor(buffer) {
        debug('constructor');
        this.buffer = new SmartBuffer(buffer);
        this.parse();
    }
    static createTgaBuffer(width, height, pixels) {
        debug('createTgaBuffer');
        var buffer = new SmartBuffer();
        // write header
        buffer.writeInt8(0);
        buffer.writeInt8(0);
        buffer.writeInt8(2);
        buffer.writeInt16LE(0);
        buffer.writeInt16LE(0);
        buffer.writeInt8(0);
        buffer.writeInt16LE(0);
        buffer.writeInt16LE(0);
        buffer.writeInt16LE(width);
        buffer.writeInt16LE(height);
        buffer.writeInt8(32);
        buffer.writeInt8(0);
        // write pixels
        var i = 0, pixel;
        while((pixel = pixels[i++])) {
            buffer.writeUInt8(pixel.b);
            buffer.writeUInt8(pixel.g);
            buffer.writeUInt8(pixel.r);
            buffer.writeUInt8(pixel.a);
        }
        return buffer.toBuffer();
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
        var buffer = this.buffer;
        var header = {};
        header.idlength = buffer.readInt8();
        header.colourMapType = buffer.readInt8();
        header.dataTypeCode = buffer.readInt8();
        header.colourMapOrigin = buffer.readInt16LE();
        header.colourMapLength = buffer.readInt16LE();
        header.colourMapDepth = buffer.readInt8();
        header.xOrigin = buffer.readInt16LE();
        header.yOrigin = buffer.readInt16LE();
        this.width = header.width = buffer.readInt16LE();
        this.height = header.height = buffer.readInt16LE();
        header.bitsPerPixel = buffer.readInt8();
        header.bytesPerPixel = header.bitsPerPixel / 8;
        header.imageDescriptor = buffer.readInt8();
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
    skipBeforeReadPixel() {
        debug('skipBeforeReadPixel');
        var header = this.header;
        var skipover = 0;
        skipover += header.idlength;
        skipover += header.colourMapType * header.colourMapLength;
        if (skipover) {
            debug('skipBeforeReadPixel', skipover);
            this.buffer.skip(skipover);
        }
    }
    readPixels() {
        debug('readPixels');
        var header = this.header;
        var buffer = this.buffer;
        var bytesPerPixel = header.bytesPerPixel;

        var pixelCount = header.width * header.height;
        var pixels = [];
        for (var i = 0; i < pixelCount; i++) {
            if (header.dataTypeCode === 2) {
                pixels.push(Pixel.from(buffer.readBuffer(bytesPerPixel)));
            } else if (header.dataTypeCode === 10) {
                var nums = new Uint8Array(buffer.readBuffer(bytesPerPixel + 1));
                var count = nums[0] & 0x7f;
                var isRLEChunk = nums[0] & 0x80;
                nums = nums.slice(1);
                for (var j = 0; j < count; j++) {
                    i++;
                    if (isRLEChunk) {
                        pixels.push(Pixel.from(nums));
                    } else {
                        pixels.push(Pixel.from(buffer.readBuffer(bytesPerPixel)));
                    }
                }
            }
        }

        this.pixels = pixels;
    }
    getPixelsBuffer() {
        debug('getPixelsBuffer');
        var result = new Uint8Array(this.pixels.length * 4);
        var width = this.header.width;
        var height = this.header.height;
        for (var i = 0; i < height; i++) {
            for (var j = 0; j < width; j++) {
                var index = i * width + j;
                var pixel = this.pixels[index];
                index = ((height - i - 1) * width + j) * 4;
                result[index] = pixel.r;
                result[index + 1] = pixel.g;
                result[index + 2] = pixel.b;
                result[index + 3] = pixel.a;
            }
        }
        return new Buffer(result);
    }
}

module.exports = TGA;