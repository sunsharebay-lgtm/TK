"""Replay KPW3 evdev taps through the actual Lua wait_tap/hit_menu functions.

Host-only dependency: lupa (Lua runtime). No Kindle devices or files are touched.
"""
from pathlib import Path
from lupa import LuaRuntime

source = (Path(__file__).resolve().parents[1] / "main.lua").read_text()
lua = LuaRuntime(unpack_returned_tuples=True)
lua.execute("""
events = {}
package.preload.ffi = function()
  return {
    cdef = function() end, sizeof = function() return 24 end,
    new = function() return {[0]={}} end,
    C = {
      poll = function(p) p[0].revents=1 return 1 end,
      read = function(fd, buffer, size)
        local event = table.remove(events, 1)
        assert(event, 'test event queue exhausted')
        buffer[0] = event
        return size
      end,
    },
  }
end
io.open = function() return nil end
function tap_events(x, y)
  events = {
    {type=3,code=53,value=x}, {type=3,code=54,value=y},
    {type=3,code=57,value=-1}, {type=0,code=0,value=0},
  }
end
""")
wait_tap, hit_menu = lua.execute(source.split("local fd = open_touch()", 1)[0] + "\nreturn wait_tap, hit_menu")
cases = [(1000, 1000), (1072, 1000), (1073, 1000), (0, 1200), (2048, 2048), (4095, 4095)]
for x, y in cases:
    lua.globals().tap_events(x, y)
    actual = wait_tap(0)
    expected = (x * 1072 // 4095, y * 1448 // 4095)
    assert actual == expected, f"KPW3 raw ({x}, {y}) became {actual}, expected {expected}"
    if y == 1000:
        assert hit_menu(actual[1]) == "home", "same row must select Information screen across its full width"
print(f"Native touch replay passed: {len(cases)} taps, including scale boundary and screen edge.")
