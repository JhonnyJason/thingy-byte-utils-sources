############################################################
import { StringDecoder } from "string_decoder"
decoder = new StringDecoder("utf-8")

slots = (new Array(256)).fill(0)
bigIntMap = slots.map((el,idx) -> BigInt(idx))


############################################################
hexChars = Array.from("0123456789abcdef")

frontHexMap = new Array(256)
# frontHexMap = {}
hexChars.forEach( (el) -> frontHexMap[el] = 16*parseInt(el, 16))

backHexMap = new Array(256)
# backHexMap = {}
hexChars.forEach( (el) -> backHexMap[el] = parseInt(el, 16))


############################################################
export bytesToBigInt = (byteBuffer) ->
    byteArray = new Uint8Array(byteBuffer)
    hex = bytesToHex(byteArray.reverse())
    return BigInt("0x"+hex)


############################################################
export bytesToUtf8 = (byteBuffer) ->
    byteArray = new Uint8Array(byteBuffer)
    return decoder.end(byteArray)

export utf8ToBytes = (utf8) -> new Uint8Array(Buffer.from(utf8, "utf8"))

############################################################
export bytesToHex = (byteBuffer) -> Buffer.from(byteBuffer).toString("hex")

export hexToBytes = (hex) -> 
    result = new Uint8Array(hex.length/2)
    for i in [0...hex.length] by 2
        result[(i/2)] = frontHexMap[hex[i]]+backHexMap[hex[i+1]]
    return result
