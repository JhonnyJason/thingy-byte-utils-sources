############################################################
import { StringDecoder } from "string_decoder"
decoder = new StringDecoder("utf-8")

slots = (new Array(256)).fill(0)
bigIntMap = slots.map((el,idx) -> BigInt(idx))


############################################################
export bytesToBigInt = (byteBuffer) ->
    byteArray = new Uint8Array(byteBuffer)
    hex = bytesToHex(byteArray.reverse())
    return BigInt("0x"+hex)


############################################################
export bytesToUtf8 = (byteBuffer) ->
    byteArray = new Uint8Array(byteBuffer)
    return decoder.end(byteArray)

export utf8ToBytes = (utf8) -> Buffer.from(utf8, "utf8")

############################################################
export bytesToHex = (byteBuffer) -> Buffer.from(byteBuffer).toString("hex")

export hexToBytes = (hex) -> Buffer.from(hex, 'hex')
