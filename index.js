const debug = require('debug')('TGA');

const tempColor = new Uint8Array(4);

// doc: http://paulbourke.net/dataformats/tga/
class TGA {
    constructor(buffer, opt) {
        debug('constructor');
        // opt = Object.assign(opt);
        this.buffer = buffer;
        this.parse();
    }
    static createTgaBuffer(width, height, pixels, dontFlipY) {
        debug('createTgaBuffer');
        const buffer = Buffer.alloc(18 + pixels.length);
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

        let offset = 18;
        for (let i = 0; i < height; i++) {
            for (let j = 0; j < width; j++) {
                const idx = ((dontFlipY ? i : height - i - 1) * width + j) * 4;
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
        const header = {};
        header.idlength = buffer.readInt8(0);
        header.colorMapType = buffer.readInt8(1);
        header.dataTypeCode = buffer.readInt8(2);
        header.colorMapOrigin = buffer.readInt16LE(3);
        header.colorMapLength = buffer.readInt16LE(5);
        header.colorMapDepth = buffer.readInt8(7);
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
        this.fixForAlpha();
    }
    readHeader() {
        debug('readHeader');
        const header = TGA.getHeader(this.buffer);
        this.width = header.width;
        this.height = header.height;
        this.bytesPerPixel = header.bytesPerPixel = header.bitsPerPixel / 8;
        this.isFlipY = !(header.imageDescriptor & 32);
        debug('readHeader', header);
        return header;
    }
    check() {
        debug('check tga file');
        const header = this.header;
        /* What can we handle */
        if (![1, 2, 10].includes(header.dataTypeCode)) {
            console.error('Can only handle image type 2 and 10');
            return false;
        }
        if (![8, 16, 24, 32].includes(header.bitsPerPixel)) {
            console.error('Can only handle pixel depths of 16, 24, and 32');
            return false;
        }
        if (header.colorMapType != 0 && header.colorMapType != 1) {
            console.error('Can only handle color map types of 0 and 1');
            return false;
        }
        return true;
    }
    setPixel(idx, color) {
        if (this.isFlipY) {
            const y = this.height - 1 - Math.floor(idx / this.width);
            idx = y * this.width + idx % this.width;
        }
        this.pixels.set(color, idx * 4);
    }

    readColor(arr, offset, bytesPerPixel) {
        if (bytesPerPixel === 3 || bytesPerPixel === 4) {
            tempColor[0] = arr[offset + 2];
            tempColor[1] = arr[offset + 1];
            tempColor[2] = arr[offset];
            tempColor[3] = bytesPerPixel === 4 ? arr[offset + 3] : 255;
        } else if (bytesPerPixel === 2) {
            tempColor[0] = (arr[offset + 1] & 0x7c) << 1;
            tempColor[1] = ((arr[offset + 1] & 0x03) << 6) | ((arr[offset] & 0xe0) >> 2);
            tempColor[2] = (arr[offset] & 0x1f) << 3;
            tempColor[3] = (arr[offset + 1] & 0x80);
        } else {
            console.error('Can\'t read color with bytesPerPixel=%s', bytesPerPixel);
        }
        return tempColor;
    }

    readColorMap(data, offset) {
        debug('readColorMap');
        const colorMapLength = this.header.colorMapLength;
        const colorMapBytesPerPixel = this.header.colorMapDepth / 8;
        const colorMap = new Uint8Array(colorMapLength * 4);
        for (let i = 0; i < colorMapLength; i++) {
            const color = this.readColor(data, offset, colorMapBytesPerPixel);
            colorMap.set(color, i * 4);
            offset += colorMapBytesPerPixel;
        }
        return {
            origin: this.header.colorMapOrigin,
            colorMap,
            bytes: colorMapLength * colorMapBytesPerPixel,
            offset,
        };
    }
    readPixels() {
        debug('readPixels');
        const header = this.header;
        const pixelCount = header.width * header.height;
        const data = new Uint8Array(this.buffer);
        let offset = 18 + this.header.idlength; // jump for Image Identification Field

        this.pixels = new Uint8Array(pixelCount * 4);

        let colorMap;

        if (header.colorMapType === 1) {
            const colorMapInfo = this.readColorMap(data, offset);
            colorMap = colorMapInfo.colorMap;
            offset = colorMapInfo.offset;
        }

        for (let i = 0; i < pixelCount; i++) {
            if (header.dataTypeCode === 2) {
                const color = this.readColor(data, offset, this.bytesPerPixel);
                offset += this.bytesPerPixel;
                this.setPixel(i, color);
            } else if (header.dataTypeCode === 10) {
                const flag = data[offset++];
                const count = flag & 0x7f;
                const isRLEChunk = flag & 0x80;
                let color = this.readColor(data, offset, this.bytesPerPixel);
                offset += this.bytesPerPixel;
                this.setPixel(i, color);
                for (let j = 0; j < count; j++) {
                    if (!isRLEChunk) {
                        color = this.readColor(data, offset, this.bytesPerPixel);
                        offset += this.bytesPerPixel;
                    }
                    this.setPixel(++i, color);
                }
            } else if (header.dataTypeCode === 1) {
                let index = data[offset];
                if (this.bytesPerPixel === 2) {
                    index = this.buffer.readUInt16LE(offset);
                } else if (this.bytesPerPixel === 4) {
                    index = this.buffer.readUInt32LE(offset);
                }
                const color = colorMap.subarray(index * 4, index * 4 + 4);
                this.setPixel(i, color);
                offset += this.bytesPerPixel;
            }
        }
    }

    fixForAlpha() {
        debug('fixForAlpha');
        let alpha0Count = 0;
        for (let i = this.pixels.length - 1; i > 0; i -= 4) {
            if (!this.pixels[i]) {
                alpha0Count++;
            }
        }
        if (alpha0Count > this.pixels.length / 4 * .98) {
            // 98% pixels are transparent, convert all alpha to 255
            for (let i = this.pixels.length - 1; i > 0; i -= 4) {
                if (!this.pixels[i]) {
                    this.pixels[i] = 255;
                }
            }
        }
    }
}

module.exports = TGA;