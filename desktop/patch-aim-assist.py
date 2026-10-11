#!/usr/bin/env python3
"""Controller aim assist for game.wasm: CPlayerPedTargeting::GetTargetingMode treats keyboard/mouse as free aim (local 5 = 1).
This makes it read the page's controller flag instead (WasmInputBlock key byte 255, see PAD_ASSIST in public/index.html), so a
controller gets the lock-on "Assisted Aim" mode. Usage: python3 desktop/patch-aim-assist.py public/b/8b0b5899ed/game.wasm"""
import sys
def uleb(b, i):
    r = s = 0
    while True:
        x = b[i]; i += 1; r |= (x & 0x7f) << s; s += 7
        if not x & 0x80: return r, i
def enc(n, width=None):
    out = bytearray()
    while True:
        x = n & 0x7f; n >>= 7
        if n or (width and len(out) + 1 < width): out.append(x | 0x80)
        else: out.append(x); break
    return bytes(out)
def sections(b):
    i = 8
    while i < len(b):
        sid = b[i]; size, j = uleb(b, i + 1); yield sid, i, j, j + size; i = j + size
def imported_funcs(b):
    for sid, _, j, end in sections(b):
        if sid != 2: continue
        n, i = uleb(b, j); count = 0
        for _ in range(n):
            l, i = uleb(b, i); i += l; l, i = uleb(b, i); i += l
            kind = b[i]; i += 1
            if kind == 0: _, i = uleb(b, i); count += 1
            elif kind == 1: i += 1; f = b[i]; i += 1; _, i = uleb(b, i); i = uleb(b, i)[1] if f & 1 else i
            elif kind == 2: f = b[i]; i += 1; _, i = uleb(b, i); i = uleb(b, i)[1] if f & 1 else i
            elif kind == 3: i += 2
            elif kind == 4: i += 1; _, i = uleb(b, i)
        return count
    return 0
def patch(b, func_index, file_off, old, new):
    """file_off: absolute offset of `old` in the module (as wasm-objdump prints it)."""
    assert bytes(b[file_off:file_off + len(old)]) == old, 'bytes differ at %x' % file_off
    nimp = imported_funcs(b)
    for sid, hdr, j, end in sections(b):
        if sid != 10: continue
        n, i = uleb(b, j)
        for k in range(n):
            size, bstart = uleb(b, i)
            if k + nimp == func_index:
                assert bstart <= file_off and file_off + len(old) <= bstart + size
                body = b[bstart:file_off] + new + b[file_off + len(old):bstart + size]
                func = enc(len(body)) + body
                code = b[j:i] + func + b[bstart + size:end]
                return b[:hdr] + bytes([10]) + enc(len(code)) + code + b[end:]
            i = bstart + size
    raise SystemExit('function not found')
def sleb(n):
    out = bytearray()
    while True:
        x = n & 0x7f; n >>= 7
        if (n == 0 and not x & 0x40) or (n == -1 and x & 0x40): out.append(x); return bytes(out)
        out.append(x | 0x80)
FUNC = 41671            # CPlayerPedTargeting::GetTargetingMode(CWeapon const*, CWeaponInfo const&)
AT = 0x18b1d4f          # `i32.const 1` before `local.set 5` in the keyboard/mouse branch
FLAG = 6583436 + 255    # wasm_input_test_key's key array + 255
NEW = b'\x42' + sleb(FLAG) + b'\x2d\x00\x00\x45'   # i64.const FLAG; i32.load8_u; i32.eqz
if __name__ == '__main__':
    path = sys.argv[1]
    b = open(path, 'rb').read()
    if b[AT:AT + len(NEW)] == NEW: raise SystemExit('already patched')
    open(path, 'wb').write(patch(b, FUNC, AT, b'\x41\x01', NEW))
    print('patched', path)
