# thingy-byte-utils

Fast byte conversions for every JS runtime, with no dependencies.
This README is the specification. Any behaviour that differs from it is a bug.

```js
import * as tbut from "thingy-byte-utils"

tbut.bytesToHex( Bytes ) -> String
tbut.hexToBytes( String ) -> Uint8Array

tbut.bytesToUtf8( Bytes ) -> String
tbut.utf8ToBytes( String ) -> Uint8Array

tbut.bytesToUvy( Bytes ) -> String
tbut.uvyToBytes( String ) -> Uint8Array

tbut.bytesToBigInt( Bytes ) -> BigInt

const pooled = new tbut.UnsafeMemPooled( KB )   // same functions, faster on V8 - see "UnsafeMemPooled"
```

`Bytes` is a `Uint8Array` (including a Node `Buffer` or a view with an offset) or an `ArrayBuffer`.

TypeScript types are included (`index.d.ts`, TypeScript 5.7 or newer). Results are typed `Uint8Array<ArrayBuffer>`, as they never sit on a `SharedArrayBuffer`, so they pass directly as a WebCrypto `BufferSource`.

### Also accepted, not recommended: shared and resizable buffers

A `SharedArrayBuffer`, a resizable `ArrayBuffer`, or a `Uint8Array` over one of them is accepted too, for convenience. Prefer passing a `.slice()` of the bytes you mean, for two reasons:

- **Slow `bytesToUtf8` in browsers.** The browsers' `TextDecoder` rejects these buffers, so the library catches that error and decodes a copy. Every such call pays for a thrown error and a copy. Node, Deno and Bun take the fast path for them.
- **Concurrent writes are your responsibility.** If another thread writes to shared memory during a call, the result is undefined: strict decoding may throw on half-written data, or return a mix of old and new bytes. The guarantees below assume the input does not change during the call.

Usually you want a view of one region anyway: passing a raw `SharedArrayBuffer` converts all of its memory.

---

## Guarantees

1. **Same result on every runtime.** Every function returns the same output and throws the same error type for every input, on Node, Deno, Bun, browsers, and engines without `toHex`/`fromHex`/`setFromHex`, `TextEncoder`/`TextDecoder` or `String.prototype.isWellFormed`. Native functions are used where they exist. The JS fallbacks behave identically.
2. **Strict decoding.** A string decoder throws for anything that is not a valid string of its format (see Errors). Nothing is silently replaced, dropped or ignored.
3. **Exact round trips.** `xToBytes(bytesToX(bytes))` equals `bytes`. `bytesToX(xToBytes(s))` equals `s` for every canonical `s`, and the canonical form of `s` otherwise. The exceptions to 1:1 are listed under each format (letter case in hex and uvy, leading zeros in uvy, trailing zeros in bigint).
4. **Inputs are never modified.**

## Not checked: argument types

Argument types are not checked. A function that expects a string must get a string, and a function that expects `Bytes` must get `Bytes`. Anything else is undefined behaviour: it may throw any error or return garbage. Check types at your own trust boundary.

The one exception is the `UnsafeMemPooled` constructor, a configuration call outside the hot paths: it checks its argument (see below).

## Errors

The *content* is always validated. Malformed content throws the same error type the platform's own equivalent throws (the message may differ between runtimes): a `SyntaxError` for hex (as `Uint8Array.fromHex`) and uvy, and a `TypeError` for UTF-8 (as a fatal `TextDecoder`).

| Function | Throws | when |
|---|---|---|
| `hexToBytes` | `SyntaxError` | the length is odd, or a char is not in `0-9 a-f A-F` |
| `utf8ToBytes` | `TypeError` | the string contains a lone surrogate (not well-formed UTF-16) |
| `bytesToUtf8` | `TypeError` | the bytes are not valid UTF-8 |
| `uvyToBytes` | `SyntaxError` | a char is not in the uvy alphabet (either case) |

The other functions accept any `Bytes` and never throw for them.

---

## hex

- `bytesToHex`: 2 lower case chars per byte, most significant nibble first. No `0x` prefix, no separators. Empty in, `""` out.
- `hexToBytes`: accepts an even-length string of `0-9 a-f A-F`. No prefix, no whitespace. `""` gives an empty `Uint8Array`.
- **Exception to 1:1:** upper case is accepted, as the native `Uint8Array.fromHex` accepts it. So `"AB"` and `"ab"` both decode to `[0xab]`. The canonical form is lower case. Compare hex strings only after lower-casing them, or compare the bytes.

## utf8

- `utf8ToBytes`: the string must be well-formed UTF-16, with no lone surrogates. No BOM is added.
- `bytesToUtf8`: the bytes must be valid UTF-8 (no overlong forms, no encoded surrogates, nothing above U+10FFFF, no truncated sequences).
- A leading BOM (`EF BB BF`) is kept as `"\uFEFF"`, never stripped, so the mapping stays 1:1.
- Need lossy conversion? Use `s.toWellFormed()` before encoding, or a non-fatal `TextDecoder` for decoding.

## uvy

Base 32 with the alphabet `0123456789abcdefghijklmnoprstuvy`. The first 16 digits are the hex digits.

- The uvy string is the bytes read as one big-endian number, written in base 32 - just as the hex string is that number in base 16. Leading zeros are kept: the length follows from the byte count.
- 5 bytes <-> 8 chars. For a byte count that is not a multiple of 5, the **first** char carries the leftover bits and is padded with 0 bits at the front. No padding chars.
  - `[0xff]` -> `"7y"` (7 * 32 + 31 = 255), `[0x00, 0x00, 0x00, 0x00, 0x01]` -> `"00000001"`.
- `bytesToUvy`: `ceil(n * 8 / 5)` chars for `n` bytes, lower case. Empty in, `""` out.
- `uvyToBytes` accepts any string of uvy chars, in either case (`ABCDEFGHIJKLMNOPRSTUVY` too, as `hexToBytes` accepts upper case). Every length is valid.
- Only the digit values are compatible with hex, not whole strings: `"ff"` in hex is not `"ff"` in uvy.

### Decoding any uvy string

`uvyToBytes` reads the string as a number. A string of `L` chars gives `floor(L * 5 / 8)` bytes (at least 1), plus one more byte if the number does not fit into that. Only `""` gives no bytes.

| string | bytes | `bytesToUvy` of it |
|---|---|---|
| `""` | `[]` | `""` |
| `"7y"` | `[0xff]` | `"7y"` |
| `"8y"` | `[0x01, 0x1f]` | `"008y"` |
| `"y"` | `[0x1f]` | `"0y"` |
| `"0"` | `[0x00]` | `"00"` |
| `"000"` | `[0x00]` | `"00"` |

- **Exception to 1:1:** a string decodes to the same bytes as its canonical form - lower case, and with the number of leading `0`s that `bytesToUvy` writes. `"8y"`, `"8Y"` and `"008y"` all decode to `[0x01, 0x1f]`; the canonical form is `"008y"`. Encoding the bytes again always gives the canonical form, and that round-trips exactly. Compare uvy strings only after a round trip, or compare the bytes.
- Leading zeros can still change the byte count: `"7y"` and `"07y"` give `[0xff]`, `"007y"` gives `[0x00, 0xff]`.

## bigint

- `bytesToBigInt`: the bytes as an unsigned little-endian integer. Empty in, `0n` out.
- **Not 1:1, and there is no inverse function:** trailing zero bytes do not change the value. `[1]`, `[1, 0]` and `[1, 0, 0]` all give `1n`.

---

## UnsafeMemPooled: results that share memory

The direct functions never share memory: every result of `hexToBytes`, `utf8ToBytes` and `uvyToBytes` has its own `ArrayBuffer`, with `byteOffset` 0. That costs one allocation per result, about 2 µs on V8 for small results.

`UnsafeMemPooled` saves that allocation. Its instance has the same functions, but small results (half the block or less) are views into a shared memory block. Larger results get their own buffer.

```js
const pooled = new tbut.UnsafeMemPooled( KB )   // block size in KB, default 8
pooled.hexToBytes("aabb")
const { utf8ToBytes } = pooled                  // destructuring works
```

- `KB` must be an integer from 1 to 1024. No argument means 8 (8 KB, as Node's `Buffer` pool). Anything else (0, 1025, 1.5, `NaN`, `"8"`, ...) throws a `RangeError` and no instance is created.
- Every instance has its own pool. Instances never affect each other or the direct functions, so each consumer in an application can tune its own instance.
- When to use it: hot paths on V8 (Node, Deno, Chromium) with many small results - up to about 10x faster for results up to 64 B. On Bun and Firefox the view costs more than the allocation, so the direct functions are faster there (measured: `testing/README.md` in the repository).

Rules for pooled results:
- **Use the `Uint8Array` itself, never its `.buffer`.** The buffer is the shared block and holds other results. Do not assume `byteOffset` is 0.
- **Use `.slice()` when you need your own copy**, for example before transferring it to a worker. Transferring `.buffer` detaches every other result in the same block.
- The library never writes to a returned result again, so results stay stable. Writing to your result changes only your result.
- A small result you keep alive also keeps its whole block alive. Use `.slice()` if you store many small results for a long time.
- Pool results start at a `byteOffset` that is a multiple of 8.

### The trade-off: speed for a shared `.buffer`

Node's `Buffer` makes the same trade-off: `Buffer.from(string)`, `Buffer.allocUnsafe()` and others return views into a shared 8 KB pool too. The rules above are the ones every Node developer already follows for `Buffer`.

What it means for sensitive data: the block under a pooled result can hold other data than your result - other results, and leftovers of the library's own work (partly decoded input of a call that threw). Anyone who gets the `.buffer` of a pooled result can read all of it. The library itself never reads or exposes that data, and it never changes a returned result.

So if you hand pooled bytes to code you do not control, or send or transfer them as an `ArrayBuffer`, pass a `.slice()` (or the view itself, never its `.buffer`). For secrets, use the direct functions: they never share memory.

---

# License
[CC0](https://creativecommons.org/publicdomain/zero/1.0/)
