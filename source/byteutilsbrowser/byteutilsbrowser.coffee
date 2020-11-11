byteutilsbrowser = {}


############################################################
byteToHex = (byte) ->
    byte = (byte & 0xFF)
    return byte.toString(16).padStart(2, '0')


############################################################
bufferToBigInt = (byteBuffer) ->
    byteBuffer = new Uint8Array(byteBuffer)
    value = 0n
    for byte,i in byteBuffer
        value += BigInt(byte) << (8n * BigInt(i))
    return value

############################################################
bufferToUtf8 = (byteBuffer) ->
    byteArray = new Uint8Array(byteBuffer)
    return String.fromCharCode.apply(null, byteArray)

utf8ToBufferBrowser = (utf8) ->  
    bytes = (new TextEncoder()).encode(utf8)
    return bytes.buffer

############################################################
bufferToHexBrowser = (byteBuffer) ->
    byteArray = new Uint8Array(byteBuffer)
    return Array.prototype.map.call(byteArray, byteToHex).join("")

hexToBufferBrowser = (hex) ->
    result = new Uint8Array(hex.length/2)
    for i in [0...hex.length] by 2
        result[(i/2)] = (parseInt(hex.substr(i, 2), 16))
    return result.buffer
    

############################################################
byteutilsbrowser.bufferToBigInt = bufferToBigInt
byteutilsbrowser.bytesToBigInt = bufferToBigInt

byteutilsbrowser.bufferToUtf8 = bufferToUtf8
byteutilsbrowser.bytesToUtf8 = bufferToUtf8

byteutilsbrowser.utf8ToBuffer = utf8ToBufferBrowser
byteutilsbrowser.utf8ToBytes = utf8ToBufferBrowser

byteutilsbrowser.bufferToHex = bufferToHexBrowser
byteutilsbrowser.bytesToHex = bufferToHexBrowser

byteutilsbrowser.hexToBuffer = hexToBufferBrowser
byteutilsbrowser.hexToBytes = hexToBufferBrowser

module.exports = byteutilsbrowser