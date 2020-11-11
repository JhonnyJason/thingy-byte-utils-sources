byteutilsnode = {}

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

utf8ToBufferNode = (utf8) -> Buffer.from(utf8, "utf8")

############################################################
bufferToHexNode = (byteBuffer) -> Buffer.from(byteBuffer).toString("hex")

hexToBufferNode = (hex) -> Buffer.from(hex, 'hex')
    

############################################################
byteutilsnode.bufferToBigInt = bufferToBigInt
byteutilsnode.bytesToBigInt = bufferToBigInt

byteutilsnode.bufferToUtf8 = bufferToUtf8
byteutilsnode.bytesToUtf8 = bufferToUtf8

byteutilsnode.utf8ToBuffer = utf8ToBufferNode
byteutilsnode.utf8ToBytes = utf8ToBufferNode

byteutilsnode.bufferToHex = bufferToHexNode
byteutilsnode.bytesToHex = bufferToHexNode

byteutilsnode.hexToBuffer = hexToBufferNode
byteutilsnode.hexToBytes = hexToBufferNode


module.exports = byteutilsnode