//############################################################
// One implementation for all runtimes - benchmark data: testing/README.md
const encoder = new TextEncoder()
const decoder = new TextDecoder()

const hasToHex = typeof Uint8Array.prototype.toHex == "function"
const hasFromHex = typeof Uint8Array.fromHex == "function"
const hasSetFromHex = typeof Uint8Array.prototype.setFromHex == "function"

//############################################################
const hexMap = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"))

// charCode -> digit value, upper case too, as the native fromHex accepts it
const hexVal = new Uint8Array(128)
for (let i = 0; i < 16; i++) hexVal["0123456789abcdef".charCodeAt(i)] = i
for (let i = 0; i < 6; i++) hexVal["ABCDEF".charCodeAt(i)] = 10 + i

// base 32, the first 16 digits stay compatible with hex
const uvyChars = "0123456789abcdefghijklmnoprstuvy"
const uvyCodes = Uint8Array.from(uvyChars, (c) => c.charCodeAt(0))
const uvyVal = new Uint8Array(128)
for (let i = 0; i < 32; i++) uvyVal[uvyCodes[i]] = i

//############################################################
//region pool
// Small results are views into a shared 8 KB block, so V8's ~2 µs
// allocation of off-heap arrays is paid once per block, not per call.
// A full block is replaced, never reused - so results stay stable forever.
const POOL_SIZE = 8192
const POOL_MAX = POOL_SIZE >>> 1
let pool = new Uint8Array(POOL_SIZE)
let poolOffset = 0

function reserve(n) {
    // a transferred (detached) pool has length 0 and gets replaced here too
    if (poolOffset + n > pool.length) {
        pool = new Uint8Array(POOL_SIZE)
        poolOffset = 0
    }
}

function commit(used) {
    const result = pool.subarray(poolOffset, poolOffset + used)
    poolOffset = (poolOffset + used + 7) & ~7 // keep 8-byte alignment like Buffer
    return result
}

//endregion

//############################################################
const toU8 = (bytes) => bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)

function jsBytesToHex(bytes) {
    let result = ""
    for (let i = 0; i < bytes.length; i++) result += hexMap[bytes[i]]
    return result
}

function jsHexInto(hex, result) {
    for (let i = 0, j = 0; j < result.length; i += 2, j++)
        result[j] = (hexVal[hex.charCodeAt(i)] << 4) | hexVal[hex.charCodeAt(i + 1)]
    return result
}

// writes s as UTF-8 into r from offset j, returns the end offset
// r needs room for 3 bytes per UTF-16 unit
function jsUtf8Into(s, r, j) {
    for (let i = 0; i < s.length; i++) {
        let c = s.charCodeAt(i)
        if (c < 0x80) r[j++] = c
        else if (c < 0x800) {
            r[j++] = 0xc0 | c >> 6
            r[j++] = 0x80 | c & 63
        } else if (c >= 0xd800 && c < 0xdc00 && (s.charCodeAt(i + 1) & 0xfc00) == 0xdc00) {
            c = 0x10000 + ((c - 0xd800) << 10) + (s.charCodeAt(++i) - 0xdc00)
            r[j++] = 0xf0 | c >> 18
            r[j++] = 0x80 | c >> 12 & 63
            r[j++] = 0x80 | c >> 6 & 63
            r[j++] = 0x80 | c & 63
        } else {
            if (c >= 0xd800 && c < 0xe000) c = 0xfffd // lone surrogate, as TextEncoder does
            r[j++] = 0xe0 | c >> 12
            r[j++] = 0x80 | c >> 6 & 63
            r[j++] = 0x80 | c & 63
        }
    }
    return j
}

//############################################################
export function bytesToBigInt(bytes) {
    // new Uint8Array(view) copies, so reverse never touches the caller's bytes
    const reversed = new Uint8Array(toU8(bytes)).reverse()
    if (reversed.length == 0) return 0n
    return BigInt("0x" + bytesToHex(reversed))
}

//############################################################
export const bytesToUtf8 = (bytes) => decoder.decode(bytes)

export function utf8ToBytes(utf8) {
    const max = utf8.length * 3
    if (max > POOL_MAX) return encoder.encode(utf8)
    reserve(max)
    // JS beats encodeInto for short strings on V8 (per-call cost)
    if (utf8.length <= 32) return commit(jsUtf8Into(utf8, pool, poolOffset) - poolOffset)
    return commit(encoder.encodeInto(utf8, pool.subarray(poolOffset, poolOffset + max)).written)
}

//############################################################
export const bytesToHex = hasToHex ? (bytes) => toU8(bytes).toHex() : (bytes) => jsBytesToHex(toU8(bytes))

export function hexToBytes(hex) {
    // the native functions throw here too - a silently dropped digit is hard to track down
    if (hex.length & 1) throw new SyntaxError("hex string of odd length")
    const n = hex.length >>> 1
    if (n > POOL_MAX) return hasFromHex ? Uint8Array.fromHex(hex) : jsHexInto(hex, new Uint8Array(n))
    reserve(n)
    const result = commit(n)
    if (hasSetFromHex) result.setFromHex(hex)
    else jsHexInto(hex, result)
    return result
}

//############################################################
// bitstream, MSB first, 5 bits per char, the last char zero-padded
// char codes are collected in a byte array and decoded once - adding
// chars to a string one by one gets very slow for large inputs (6 MB/s on V8)
export function bytesToUvy(bytes) {
    bytes = toU8(bytes)
    const n = Math.ceil(bytes.length * 8 / 5)
    let codes
    if (n > POOL_MAX) codes = new Uint8Array(n)
    else {
        reserve(n)
        codes = pool.subarray(poolOffset, poolOffset + n) // scratch, not committed
    }
    let acc = 0, bits = 0, j = 0
    for (let i = 0; i < bytes.length; i++) {
        acc = ((acc << 8) | bytes[i]) & 0xfff // at most 12 bits are pending
        bits += 8
        while (bits >= 5) {
            bits -= 5
            codes[j++] = uvyCodes[(acc >>> bits) & 31]
        }
    }
    if (bits > 0) codes[j] = uvyCodes[(acc << (5 - bits)) & 31]
    return decoder.decode(codes)
}

export function uvyToBytes(uvy) {
    // lengths 1, 3 and 6 mod 8 cannot come out of bytesToUvy - a truncated string
    if ((0b1001010 >>> (uvy.length & 7)) & 1) throw new SyntaxError("uvy string of impossible length")
    const n = (uvy.length * 5) >>> 3
    let result
    if (n > POOL_MAX) result = new Uint8Array(n)
    else {
        reserve(n)
        result = commit(n)
    }
    let acc = 0, bits = 0
    for (let i = 0, j = 0; i < uvy.length; i++) {
        acc = ((acc << 5) | uvyVal[uvy.charCodeAt(i)]) & 0xfff
        bits += 5
        if (bits >= 8) {
            bits -= 8
            result[j++] = acc >>> bits
        }
    }
    return result
}
