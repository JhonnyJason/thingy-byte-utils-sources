# thingy-byte-utils

# Why?
My usecases only required a minimal subset of byte utility functions so I decided to create a more lightweight package for exactly those purposes.

# What?
- A very minimal, dependency-free ESM package for byte conversions.
- One implementation for all runtimes (Node, Deno, Bun, browsers), tuned for speed: native `toHex`/`fromHex`/`setFromHex` and `TextEncoder`/`TextDecoder` where available, with JS fallbacks.
- Uses native BigInt.

Current Functionality
---------------------

```coffeescript
import * as tbut from "thingy-byte-utils"

tbut.bytesToBigInt( ArrayBuffer | Uint8Array ) -> BigInt   # little-endian, empty -> 0n

tbut.hexToBytes( String ) -> Uint8Array
tbut.bytesToHex( ArrayBuffer | Uint8Array ) -> String

tbut.utf8ToBytes( String ) -> Uint8Array
tbut.bytesToUtf8( ArrayBuffer | Uint8Array ) -> String

tbut.uvyToBytes( String ) -> Uint8Array
tbut.bytesToUvy( ArrayBuffer | Uint8Array ) -> String
```

A Node `Buffer` is a `Uint8Array`, so it works as input everywhere.

### uvy
Base 32 with the alphabet `0123456789abcdefghijklmnoprstuvy` - the first 16 digits are the hex digits.
- Bitstream, MSB first, 5 bits per char, the last char zero-padded, no padding chars (RFC 4648 style, own alphabet). 5 bytes <-> 8 chars.
- Only the digit values are hex-compatible, not whole strings: `"ff"` in hex is not `"ff"` in uvy.

Notice:

- This is an unsafe library. It does not check for correct types or characters.
    You are responsible for checking types and format!
    Only malformed string lengths throw a `SyntaxError`: an odd hex length, a uvy length of 1, 3 or 6 mod 8.
- Hex values here do not come with the "0x" prefix and `hexToBytes` does not accept it.
- **Results may be views into a shared memory pool.**
    - Pass the `Uint8Array` itself, never its `.buffer` - that is the shared block and it may contain other results.
    - Use `.slice()` when you need an own copy, e.g. before transferring it to a worker.
    - Results never change after they are returned.

Feedback on improvements welcome - maybe there are some few functions to be added ;-)

---

# License
[CCO](https://creativecommons.org/publicdomain/zero/1.0/)