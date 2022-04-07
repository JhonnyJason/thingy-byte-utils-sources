############################################################
encoder = new TextEncoder("utf-8")
decoder = new TextDecoder("utf-8")

############################################################
slots = (new Array(256)).fill(0)
hexMap = slots.map((el, idx) -> idx.toString(16).padStart(2, '0'))
bigIntMap = slots.map((el,idx) -> BigInt(idx))

############################################################
hexChars = Array.from("0123456789abcdef")

frontHexMap =
hexChars.forEach( (el) -> frontHexMap[el] = 16*parseInt(el, 16))

backHexMap = {}
hexChars.forEach( (el) -> backHexMap[el] = parseInt(el, 16))



############################################################
export bytesToBigInt = (byteBuffer) ->
    byteBuffer = new Uint8Array(byteBuffer)
    value = 0n
    for byte,i in byteBuffer
        value += bigIntMap[byte] << (8n * bigIntMap[i])
    return value

# export bytesToBigInt = (byteBuffer) ->
#     byteBuffer = new Uint8Array(byteBuffer)
#     value = 0n
#     for byte,i in byteBuffer
#         value += BigInt(byte) << (8n * BigInt(i))
#     return value



############################################################
export bytesToUtf8 = (byteBuffer) ->
    return decoder.decode(byteBuffer)

export utf8ToBytes = (utf8) ->
    bytes = encoder.encode(utf8)
    return bytes.buffer

############################################################
export bytesToHex = (byteBuffer) ->
    byteArray = new Uint8Array(byteBuffer)
    result = ""
    result += hexMap[byte] for byte in byteArray
    return result

export hexToBytes = (hex) ->
    result = new Uint8Array(hex.length/2)
    for i in [0...hex.length] by 2
        result[(i/2)] = frontHexMap[hex[i]]+backHexMap[hex[i+1]]
    return result.buffer
    