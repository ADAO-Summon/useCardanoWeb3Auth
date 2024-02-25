export const fromHex = (hex: string) => {
   //convert string to UInt8Array
    return new Uint8Array(hex.split('').map((c, i) => hex.substr(i * 2, 2)).map(c => parseInt(c, 16)));
}

export const toHex = (buffer: Uint8Array) => {
    //convert UInt8Array to hex string
    return Array.prototype.map.call(buffer, x => ('00' + x.toString(16)).slice(-2)).join('');
}