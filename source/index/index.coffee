############################################################
import { StringDecoder } from "string_decoder"
decoder = new StringDecoder("utf-8")

############################################################
# bytesToBigInt = (byteBuffer) ->
#     byteBuffer = new Uint8Array(byteBuffer)
#     value = 0n
#     for byte,i in byteBuffer
#         value += BigInt(byte) << (8n * BigInt(i))
#     return value

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









# function numberTo32BytesBE(num: bigint) {
#   const length = 32;
#   const hex = num.toString(16).padStart(length * 2, '0');
#   return hexToBytes(hex);
# }

# function numberTo32BytesLE(num: bigint) {
#   return numberTo32BytesBE(num).reverse();
# }

# // Little-endian check for first LE bit (last BE bit);
# function edIsNegative(num: bigint) {
#   return (mod(num) & _1n) === _1n;
# }

# // Little Endian
# function bytesToNumberLE(uint8a: Uint8Array): bigint {
#   if (!(uint8a instanceof Uint8Array)) throw new Error('Expected Uint8Array');
#   return BigInt('0x' + bytesToHex(Uint8Array.from(uint8a).reverse()));
# }

# function bytes255ToNumberLE(bytes: Uint8Array): bigint {
#   return mod(bytesToNumberLE(bytes) & (_2n ** _255n - _1n));
# }
# // -------------------------

# function mod(a: bigint, b: bigint = CURVE.P) {
#   const res = a % b;
#   return res >= _0n ? res : b + res;
# }
