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
utf8ToBufferBrowser = (utf8) ->
    result = new Uint8Array(utf8.length)
    for i in [0...utf8.length]
        result[i] = utf8.charCodeAt(i)
    return result.buffer

utf8ToBufferNode = (utf8) -> Buffer.from(utf8, "utf8")


############################################################
if typeof window == "object"
    exports.bufferToBigInt = bufferToBigInt
    exports.bufferToUtf8 = bufferToUtf8
    exports.utf8ToBuffer = utf8ToBufferBrowser
    exports.bufferToHex = bufferToHexBrowser
    exports.hexToBuffer = hexToBufferBrowser
else
    exports.bufferToBigInt = bufferToBigInt
    exports.bufferToUtf8 = bufferToUtf8
    exports.utf8ToBuffer = utf8ToBufferNode
    exports.bufferToHex = bufferToHexNode
    exports.hexToBuffer = hexToBufferNode
