// Types for thingy-byte-utils - the specification is README.md
// a Node Buffer is a Uint8Array, a view may have an offset
// shared (and resizable) buffers are accepted, not recommended - see README
export type Bytes = Uint8Array | ArrayBuffer | SharedArrayBuffer

export function bytesToHex(bytes: Bytes): string
export function hexToBytes(hex: string): Uint8Array<ArrayBuffer>

export function bytesToUtf8(bytes: Bytes): string
export function utf8ToBytes(utf8: string): Uint8Array<ArrayBuffer>

export function bytesToUvy(bytes: Bytes): string
export function uvyToBytes(uvy: string): Uint8Array<ArrayBuffer>

export function bytesToBigInt(bytes: Bytes): bigint

// same functions, but small results are views into a shared block - see README "UnsafeMemPooled"
export class UnsafeMemPooled {
    /** @param kb block size in KB, an integer from 1 to 1024 - anything else throws a RangeError */
    constructor(kb?: number)
    bytesToHex: typeof bytesToHex
    hexToBytes: typeof hexToBytes
    bytesToUtf8: typeof bytesToUtf8
    utf8ToBytes: typeof utf8ToBytes
    bytesToUvy: typeof bytesToUvy
    uvyToBytes: typeof uvyToBytes
    bytesToBigInt: typeof bytesToBigInt
}
