//############################################################
// One implementation for all runtimes - benchmark data: testing/README.md
// missing in some minimal runtimes - the JS fallbacks take over then
const encoder = typeof TextEncoder == "function" ? new TextEncoder() : null
// strict and 1:1: invalid UTF-8 throws a TypeError, a leading BOM is kept
const decoder = typeof TextDecoder == "function" ? new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }) : null

const hasToHex = typeof Uint8Array.prototype.toHex == "function"
const hasFromHex = typeof Uint8Array.fromHex == "function"
const hasSetFromHex = typeof Uint8Array.prototype.setFromHex == "function"
const hasIsWellFormed = typeof String.prototype.isWellFormed == "function"

//############################################################
const hexMap = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"))

// charCode -> digit value, upper case too, as the native fromHex accepts it
// 0xff marks an invalid char
const hexVal = new Uint8Array(128).fill(0xff)
for (let i = 0; i < 16; i++) hexVal["0123456789abcdef".charCodeAt(i)] = i
for (let i = 0; i < 6; i++) hexVal["ABCDEF".charCodeAt(i)] = 10 + i

// base 32, the first 16 digits stay compatible with hex
const uvyChars = "0123456789abcdefghijklmnoprstuvy"
const uvyCodes = Uint8Array.from(uvyChars, (c) => c.charCodeAt(0))
// charCode -> digit value, upper case too - 0xff marks an invalid char
const uvyVal = new Uint8Array(128).fill(0xff)
for (let i = 0; i < 32; i++) uvyVal[uvyCodes[i]] = uvyVal[uvyChars.toUpperCase().charCodeAt(i)] = i

//############################################################
// private scratch for bytesToUvy: overwritten by every call, never returned,
// so no result memory is shared - larger outputs get their own array
const SCRATCH_SIZE = 16384 // chars - testing/README.md "bytesToUvy scratch size"
const scratch = new Uint8Array(SCRATCH_SIZE)

//############################################################
const toU8 = (bytes) => bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)

function jsBytesToHex(bytes) {
    let result = ""
    for (let i = 0; i < bytes.length; i++) result += hexMap[bytes[i]]
    return result
}

function jsHexInto(hex, result) {
    // valid chars are < 128 with values < 16 - anything else sets a bit >= 0x80 in bad
    let bad = 0
    for (let i = 0, j = 0; j < result.length; i += 2, j++) {
        const c1 = hex.charCodeAt(i), c2 = hex.charCodeAt(i + 1)
        const h = hexVal[c1 & 127], l = hexVal[c2 & 127]
        bad |= c1 | c2 | h | l
        result[j] = (h << 4) | l
    }
    if (bad > 127) throw new SyntaxError("hex string with invalid char")
    return result
}

// String.fromCharCode over an array of char codes, in chunks below the engines' argument limit
function jsFromCodes(codes) {
    let s = ""
    for (let i = 0; i < codes.length; i += 8192) s += String.fromCharCode.apply(null, codes.subarray(i, i + 8192))
    return s
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
            if (c >= 0xd800 && c < 0xe000) throw new TypeError("string with lone surrogate")
            r[j++] = 0xe0 | c >> 12
            r[j++] = 0x80 | c >> 6 & 63
            r[j++] = 0x80 | c & 63
        }
    }
    return j
}

const lonePair = /\p{Cs}/u // with the u flag only a lone surrogate is a Cs code point
const isWellFormed = hasIsWellFormed ? (s) => s.isWellFormed() : (s) => !lonePair.test(s)

function checkWellFormed(s) {
    if (!isWellFormed(s)) throw new TypeError("string with lone surrogate")
}

// strict UTF-8 -> string, same results and errors as the fatal TextDecoder
function jsUtf8Decode(bytes) {
    const units = new Uint16Array(bytes.length) // never more UTF-16 units than bytes
    let j = 0
    for (let i = 0; i < bytes.length;) {
        let c = bytes[i++]
        if (c < 0x80) {
            units[j++] = c
            continue
        }
        let need, min
        if (c >= 0xc2 && c < 0xe0) { need = 1; min = 0x80; c &= 0x1f }
        else if (c >= 0xe0 && c < 0xf0) { need = 2; min = 0x800; c &= 0x0f }
        else if (c >= 0xf0 && c < 0xf5) { need = 3; min = 0x10000; c &= 0x07 }
        else throw new TypeError("invalid UTF-8")
        if (i + need > bytes.length) throw new TypeError("invalid UTF-8")
        for (; need > 0; need--) {
            const b = bytes[i++]
            if ((b & 0xc0) != 0x80) throw new TypeError("invalid UTF-8")
            c = (c << 6) | (b & 63)
        }
        // overlong, encoded surrogate or above U+10FFFF
        if (c < min || (c >= 0xd800 && c < 0xe000) || c > 0x10ffff) throw new TypeError("invalid UTF-8")
        if (c < 0x10000) units[j++] = c
        else {
            c -= 0x10000
            units[j++] = 0xd800 | (c >> 10)
            units[j++] = 0xdc00 | (c & 0x3ff)
        }
    }
    return jsFromCodes(units.subarray(0, j))
}

//############################################################
export function bytesToBigInt(bytes) {
    // new Uint8Array(view) copies, so reverse never touches the caller's bytes
    const reversed = new Uint8Array(toU8(bytes)).reverse()
    if (reversed.length == 0) return 0n
    return BigInt("0x" + bytesToHex(reversed))
}

//############################################################
// browsers' TextDecoder throws for a shared or resizable buffer - retrying with a plain copy
// costs nothing on the hot path, and invalid UTF-8 throws the same TypeError again
function decodeUtf8(bytes) {
    try { return decoder.decode(bytes) }
    catch { return decoder.decode(toU8(bytes).slice()) }
}
export const bytesToUtf8 = decoder ? decodeUtf8 : (bytes) => jsUtf8Decode(toU8(bytes))

//############################################################
export const bytesToHex = hasToHex ? (bytes) => toU8(bytes).toHex() : (bytes) => jsBytesToHex(toU8(bytes))

//############################################################
// the bytes as one big-endian number in base 32: full blocks of 5 bytes <-> 8 chars,
// a partial block comes first, padded at the front
// char codes are collected in a byte array and decoded once - adding
// chars to a string one by one gets very slow for large inputs (6 MB/s on V8)
export function bytesToUvy(bytes) {
    bytes = toU8(bytes)
    const head = bytes.length % 5
    const headChars = (head * 8 + 4) / 5 | 0 // 0, 2, 4, 5 or 7
    const n = headChars + (bytes.length - head) / 5 * 8
    const codes = n > SCRATCH_SIZE ? new Uint8Array(n) : scratch.subarray(0, n)
    // at most 32 bits - a double holds them exactly
    let v = 0
    for (let i = 0; i < head; i++) v = v * 256 + bytes[i]
    for (let j = headChars - 1; j >= 0; j--, v = Math.floor(v / 32)) codes[j] = uvyCodes[v % 32]
    // 40 bits do not fit an int32: the first byte goes in hi, the other 4 in lo
    for (let i = head, j = headChars; i < bytes.length; i += 5, j += 8) {
        const hi = bytes[i]
        const lo = bytes[i + 1] << 24 | bytes[i + 2] << 16 | bytes[i + 3] << 8 | bytes[i + 4]
        codes[j] = uvyCodes[hi >>> 3]
        codes[j + 1] = uvyCodes[(hi & 7) << 2 | lo >>> 30]
        codes[j + 2] = uvyCodes[lo >>> 25 & 31]
        codes[j + 3] = uvyCodes[lo >>> 20 & 31]
        codes[j + 4] = uvyCodes[lo >>> 15 & 31]
        codes[j + 5] = uvyCodes[lo >>> 10 & 31]
        codes[j + 6] = uvyCodes[lo >>> 5 & 31]
        codes[j + 7] = uvyCodes[lo & 31]
    }
    return decoder ? decoder.decode(codes) : jsFromCodes(codes)
}

// 0xff for an invalid char, so OR-ing all digits shows one as a value > 31
const uvyDigit = (uvy, i) => {
    const c = uvy.charCodeAt(i)
    return c < 128 ? uvyVal[c] : 0xff
}

//############################################################
//region pooled API
// poolBytes 0: no pool, every result gets its own array (n > -1 always)
// otherwise small results are views into a shared block, so V8's ~2 µs
// allocation of off-heap arrays is paid once per block, not per call.
// A full block is replaced, never reused - so results stay stable forever.
function createApi(poolBytes) {
    const POOL_MAX = poolBytes ? poolBytes >>> 1 : -1
    let pool = new Uint8Array(poolBytes)
    let poolOffset = 0

    function reserve(n) {
        // a transferred (detached) pool has length 0 and gets replaced here too,
        // also for an empty result at offset 0
        if (poolOffset + n > pool.length || pool.length == 0) {
            pool = new Uint8Array(poolBytes)
            poolOffset = 0
        }
    }

    function commit(used) {
        const result = pool.subarray(poolOffset, poolOffset + used)
        poolOffset = (poolOffset + used + 7) & ~7 // keep 8-byte alignment like Buffer
        return result
    }

    function utf8ToBytes(utf8) {
        const max = utf8.length * 3
        if (max > POOL_MAX) {
            if (!encoder) {
                const buf = new Uint8Array(max)
                return buf.slice(0, jsUtf8Into(utf8, buf, 0))
            }
            // TextEncoder would silently write U+FFFD for a lone surrogate
            checkWellFormed(utf8)
            return encoder.encode(utf8)
        }
        reserve(max)
        // JS beats encodeInto for short strings on V8 (per-call cost)
        if (utf8.length <= 32 || !encoder) return commit(jsUtf8Into(utf8, pool, poolOffset) - poolOffset)
        checkWellFormed(utf8)
        return commit(encoder.encodeInto(utf8, pool.subarray(poolOffset, poolOffset + max)).written)
    }

    function hexToBytes(hex) {
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

    function uvyToBytes(uvy) {
        // every string is a number: floor(L * 5 / 8) bytes but at least 1,
        // one more if it does not fit - only the head block can overflow
        const headChars = uvy.length & 7
        let bad = 0, v = 0 // at most 35 bits - a double holds them exactly
        for (let i = 0; i < headChars; i++) {
            const d = uvyDigit(uvy, i)
            bad |= d
            v = v * 32 + d
        }
        let head = headChars * 5 >>> 3
        if (v >= 2 ** (head * 8) || uvy.length == 1) head++
        const n = head + (uvy.length - headChars) / 8 * 5
        let result
        if (n > POOL_MAX) result = new Uint8Array(n)
        else {
            reserve(n)
            result = commit(n)
        }
        for (let j = head - 1; j >= 0; j--, v = Math.floor(v / 256)) result[j] = v % 256
        for (let i = headChars, j = head; i < uvy.length; i += 8, j += 5) {
            const d0 = uvyDigit(uvy, i), d1 = uvyDigit(uvy, i + 1), d2 = uvyDigit(uvy, i + 2), d3 = uvyDigit(uvy, i + 3)
            const d4 = uvyDigit(uvy, i + 4), d5 = uvyDigit(uvy, i + 5), d6 = uvyDigit(uvy, i + 6), d7 = uvyDigit(uvy, i + 7)
            bad |= d0 | d1 | d2 | d3 | d4 | d5 | d6 | d7
            const lo = (d1 & 3) << 30 | d2 << 25 | d3 << 20 | d4 << 15 | d5 << 10 | d6 << 5 | d7
            result[j] = d0 << 3 | d1 >>> 2
            result[j + 1] = lo >>> 24
            result[j + 2] = lo >>> 16
            result[j + 3] = lo >>> 8
            result[j + 4] = lo
        }
        if (bad > 31) throw new SyntaxError("uvy string with invalid char")
        return result
    }

    return { bytesToBigInt, bytesToUtf8, utf8ToBytes, bytesToHex, hexToBytes, bytesToUvy, uvyToBytes }
}

//endregion

//############################################################
// the direct API: no pool, every result owns its whole .buffer
export const { utf8ToBytes, hexToBytes, uvyToBytes } = createApi(0)

// opt-in pool, isolated per instance - results share memory (see README)
export class UnsafeMemPooled {
    constructor(kb = 8) {
        // checked before anything is created
        if (!Number.isInteger(kb) || kb < 1 || kb > 1024) throw new RangeError("pool size must be an integer from 1 to 1024 (KB)")
        // closures, not methods: destructured functions keep working
        Object.assign(this, createApi(kb * 1024))
    }
}
