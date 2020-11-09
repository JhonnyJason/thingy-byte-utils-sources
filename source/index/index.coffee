Object.defineProperty(exports, "__esModule", { value: true })

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


############################################################
bufferToHexBrowser = (byteBuffer) ->
    byteArray = new Uint8Array(byteBuffer)
    return Array.prototype.map.call(byteArray, byteToHex).join("")

bufferToHexNode = (byteBuffer) -> Buffer.from(byteBuffer).toString("hex")

############################################################
hexToBufferBrowser = (hex) ->
    result = new Uint8Array(hex.length/2)
    for i in [0...hex.length] by 2
        result[(i/2)] = (parseInt(hex.substr(i, 2), 16))
    return result.buffer

hexToBufferNode = (hex) -> Buffer.from(hex, 'hex')
    
############################################################
utf8ToBufferNode = (utf8) -> Buffer.from(utf8, "utf8")

utf8ToBufferBrowser = (utf8) ->  
    bytes = (new TextEncoder()).encode(utf8)
    return bytes.buffer


############################################################
if typeof window == "object"
    exports.bufferToBigInt = bufferToBigInt
    exports.bytesToBigInt = bufferToBigInt

    exports.bufferToUtf8 = bufferToUtf8
    exports.bytesToUtf8 = bufferToUtf8

    exports.utf8ToBuffer = utf8ToBufferBrowser
    exports.utf8ToBytes = utf8ToBufferBrowser

    exports.bufferToHex = bufferToHexBrowser
    exports.bytesToHex = bufferToHexBrowser

    exports.hexToBuffer = hexToBufferBrowser
    exports.hexToBytes = hexToBufferBrowser
else
    exports.bufferToBigInt = bufferToBigInt
    exports.bytesToBigInt = bufferToBigInt

    exports.bufferToUtf8 = bufferToUtf8
    exports.bytesToUtf8 = bufferToUtf8

    exports.utf8ToBuffer = utf8ToBufferNode
    exports.utf8ToBytes = utf8ToBufferNode

    exports.bufferToHex = bufferToHexNode
    exports.bytesToHex = bufferToHexNode

    exports.hexToBuffer = hexToBufferNode
    exports.hexToBytes = hexToBufferNode
