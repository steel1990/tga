const r = require('restructure');
const debug = require('debug')('TGA');

const tgaStruct = new r.Struct({
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

const tempColor = new Uint8Array(4);

class TGA {
    constructor(buf) {
        this._buf = buf;
        this.data = new Uint8Array(buf);
        this.currentOffset = 0;
        this.parse();
    }

    parseHeader() {
        const stream = new r.DecodeStream(this._buf);
        this.header = tgaStruct.decode(stream);
        this.width = this.header.width;
        this.height = this.header.height;
        this.isFlipY = !(this.header.imageDescriptor & 32);
        this.currentOffset = 18 + this.header.idLength;
        debug('getHeader', this.header);
    }

    check() {
        let isValid = true;
        return isValid;
    }
    
    readColor(offset, bytesPerPixel) {
        const arr = this.data;
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
        } else if (bytesPerPixel === 1) {
            tempColor[0] = tempColor[1] = tempColor[2] = arr[offset];
            tempColor[3] = 255;
        } else {
            console.error('Can\'t read color with bytesPerPixel=%s', bytesPerPixel);
        }
        return tempColor;
    }

    readColorWithColorMap(offset, bytesPerPixel) {
        let index = 0;
        if (bytesPerPixel === 1) {
            index = this._buf.readUInt8(offset);
        } else if (bytesPerPixel === 2) {
            index = this._buf.readUInt16LE(offset);
        } else if (bytesPerPixel === 4) {
            index = this._buf.readUInt32LE(offset);
        }
        return this.colorMap.subarray(index * 4, index * 4 + 4);
    }

    readColorAuto(offset, bytesPerPixel, isUsingColorMap) {
        return isUsingColorMap ? this.readColorWithColorMap(offset, bytesPerPixel) : this.readColor(offset, bytesPerPixel);
    }

    parseColorMap() {
        const len = this.header.colorMapLength;
        const bytesPerPixel = this.header.colorMapDepth / 8;
        const colorMap = new Uint8Array(len * 4);
        for (let i = 0; i < len; i++) {
            const color = this.readColor(this.currentOffset, bytesPerPixel);
            this.currentOffset += bytesPerPixel;
            colorMap.set(color, i * 4);
        }
        this.colorMap = colorMap;
    }

    setPixel(pixels, idx, color) {
        const { width, height } = this.header;
        if (this.isFlipY) {
            const y = height - 1 - Math.floor(idx / width);
            idx = y * width + idx % width;
        }
        pixels.set(color, idx * 4);
    }

    parsePixels() {
        const header = this.header;
        const pixelCount = header.width * header.height;
        const pixels = new Uint8Array(pixelCount * 4);
        const bytesPerPixel = header.bitsPerPixel / 8;

        const isUsingColorMap = [1, 9].includes(header.dataType);
        const isUsingRLE = [9, 10, 11].includes(header.dataType);

        console.log('xx isUsingColorMap=%s isUsingRLE=%s', isUsingColorMap, isUsingRLE);

        let offset = this.currentOffset;

        for (let i = 0; i < pixelCount; i++) {
            if (isUsingRLE) {
                const flag = this.data[offset++];
                const count = flag & 0x7f;
                const isRLEChunk = flag & 0x80;

                let color = this.readColorAuto(offset, bytesPerPixel, isUsingColorMap);
                offset += bytesPerPixel;
                this.setPixel(pixels, i, color);
                for (let j = 0; j < count; j++) {
                    if (!isRLEChunk) {
                        color = this.readColorAuto(offset, bytesPerPixel, isUsingColorMap);
                        offset += bytesPerPixel;
                    }
                    this.setPixel(pixels, ++i, color);
                }
            } else {
                const color = this.readColorAuto(offset, bytesPerPixel, isUsingColorMap);
                offset += bytesPerPixel;
                this.setPixel(pixels, i, color);
            }
        }
        this.pixels = pixels;
    }

    parse() {
        this.parseHeader();
        if (this.header.colorMapType === 1) {
            this.parseColorMap();
        }
        this.parsePixels();
    }
}

module.exports = TGA;