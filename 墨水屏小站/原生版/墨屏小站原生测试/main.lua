local ffi = require("ffi")

ffi.cdef[[
  typedef long ssize_t;
  typedef unsigned long size_t;
  struct timeval {
    long tv_sec;
    long tv_usec;
  };
  int open(const char *pathname, int flags, ...);
  int close(int fd);
  ssize_t read(int fd, void *buf, size_t count);
  int usleep(unsigned int usec);
  struct pollfd {
    int fd;
    short events;
    short revents;
  };
  int poll(struct pollfd *fds, unsigned long nfds, int timeout);
  struct input_event {
    struct timeval time;
    unsigned short type;
    unsigned short code;
    int value;
  };
]]

local C = ffi.C
local O_RDONLY = 0
local EV_SYN = 0
local EV_KEY = 1
local EV_ABS = 3
local BTN_TOUCH = 330
local ABS_X = 0
local ABS_Y = 1
local ABS_MT_POSITION_X = 53
local ABS_MT_POSITION_Y = 54
local ABS_MT_TRACKING_ID = 57
local SYN_REPORT = 0
local POLLIN = 1
local EVENT_SIZE = ffi.sizeof("struct input_event")
local event = ffi.new("struct input_event[1]")
local pollfd = ffi.new("struct pollfd[1]")

local FBINK = os.getenv("FBINK") or "/mnt/us/koreader/fbink"
local SCREEN_W = 1072
local SCREEN_H = 1448
local LIBRARY_TOP = 320
local LIBRARY_ROW_HEIGHT = 130
local MENU = {
  {label = "Information screen", action = "home", row = 10, top = 300, bottom = 510},
  {label = "Local library", action = "library", row = 16, top = 520, bottom = 730},
  {label = "WeRead web", action = "weread", row = 22, top = 740, bottom = 950},
  {label = "KOReader", action = "koreader", row = 28, top = 960, bottom = 1170},
  {label = "Exit", action = "exit", row = 34, top = 1180, bottom = 1425},
}

local function shell_quote(value)
  return "'" .. tostring(value):gsub("'", "'\\''") .. "'"
end

local function draw(args)
  os.execute(shell_quote(FBINK) .. " -q " .. args .. " >/dev/null 2>/dev/null")
end

local function log(message)
  local file = io.open("/mnt/us/moping-station-native-test.log", "a")
  if file then
    file:write(os.date("%Y-%m-%d %H:%M:%S ") .. message .. "\n")
    file:close()
  end
end

local function clear(full)
  if full then
    draw("-f -c")
  else
    draw("-c")
  end
end

local function text(value, size, y)
  draw("-F TALL -S " .. size .. " -m -y " .. y .. " " .. shell_quote(value))
end

local function touch_candidates()
  local candidates = {}
  local devices = io.open("/proc/bus/input/devices", "r")
  if devices then
    local block = {}
    local function add_block()
      local description = table.concat(block, "\n"):lower()
      if description:match("touch") or description:match("zforce") or description:match("wacom") then
        local event_node = description:match("handlers:[^\n]-event(%d+)")
        if event_node then candidates[#candidates + 1] = tonumber(event_node) end
      end
      block = {}
    end
    for line in devices:lines() do
      if line == "" then add_block() else block[#block + 1] = line end
    end
    add_block()
    devices:close()
  end
  for index = 0, 9 do
    local seen = false
    for _, candidate in ipairs(candidates) do
      if candidate == index then seen = true break end
    end
    if not seen then candidates[#candidates + 1] = index end
  end
  return candidates
end

local function open_touch()
  -- KOReader's KPW3 profile uses event1. Prefer it over heuristic matches:
  -- event0 is commonly a different framework/input endpoint on this model.
  local candidates = { 1 }
  for _, index in ipairs(touch_candidates()) do
    if index ~= 1 then candidates[#candidates + 1] = index end
  end
  for _, index in ipairs(candidates) do
    local fd = C.open("/dev/input/event" .. index, O_RDONLY)
    if fd >= 0 then
      log("INPUT: opened /dev/input/event" .. index)
      return fd
    end
  end
  log("INPUT: no event device could be opened")
  return -1
end

local function wait_tap(fd)
  local x, y, touching, saw_coordinates, saw_contact_signal = 0, 0, false, false, false
  local deadline = os.time() + 90
  while true do
    if os.time() >= deadline then
      log("INPUT: timeout")
      return nil, nil
    end
    pollfd[0].fd = fd
    pollfd[0].events = POLLIN
    pollfd[0].revents = 0
    C.poll(pollfd, 1, 1000)
    if pollfd[0].revents ~= 0 then
      local bytes = C.read(fd, event, EVENT_SIZE)
      if bytes == EVENT_SIZE then
        local ev = event[0]
        if ev.type == EV_ABS then
          if ev.code == ABS_X or ev.code == ABS_MT_POSITION_X then
            x = ev.value
            saw_coordinates = true
            touching = true
          elseif ev.code == ABS_Y or ev.code == ABS_MT_POSITION_Y then
            y = ev.value
            saw_coordinates = true
            touching = true
          elseif ev.code == ABS_MT_TRACKING_ID then
            saw_contact_signal = true
            touching = ev.value >= 0
          end
        elseif ev.type == EV_KEY and ev.code == BTN_TOUCH then
          saw_contact_signal = true
          touching = ev.value ~= 0
        elseif ev.type == EV_SYN and ev.code == SYN_REPORT
            and saw_coordinates and x >= 0 and y >= 0
            and ((saw_contact_signal and not touching) or not saw_contact_signal) then
          -- KPW3 event1 always reports a 0..4095 range, including the upper-left.
          local screen_x = math.floor(math.max(0, math.min(4095, x)) * SCREEN_W / 4095)
          local screen_y = math.floor(math.max(0, math.min(4095, y)) * SCREEN_H / 4095)
          log("INPUT: tap raw=" .. x .. "," .. y .. " screen=" .. screen_x .. "," .. screen_y)
          return screen_x, screen_y
        end
      end
    end
  end
end

local function render_header(title)
  clear(true)
  text("MOPING STATION", 3, 5)
  text(title, 2, 9)
end

local function render_home()
  render_header("Information screen")
  text(os.date("%Y-%m-%d"), 3, -4)
  text(os.date("%H:%M"), 5, -1)
  text("Tap the screen to return", 2, -8)
end

local function render_menu()
  render_header("Main menu")
  for index, item in ipairs(MENU) do
    -- A padded, inverted row makes each touch target visible on e-ink.
    draw("-F TALL -S 2 -m -p -y " .. item.row .. " " .. shell_quote(index .. ".  " .. item.label))
  end
  text("Tap a black row", 1, 40)
end

local function list_documents()
  local files = {}
  local pipe = io.popen("find /mnt/us/documents -maxdepth 1 -type f 2>/dev/null | sort")
  if pipe then
    for path in pipe:lines() do
      local lower = path:lower()
      if lower:match("%.epub$") or lower:match("%.pdf$") or lower:match("%.mobi$") or lower:match("%.azw3$") or lower:match("%.txt$") then
        files[#files + 1] = path
      end
      if #files == 8 then break end
    end
    pipe:close()
  end
  return files
end

local function render_library(files)
  render_header("Local library")
  if #files == 0 then
    text("No local books found", 2, -2)
    text("Put EPUB, PDF, MOBI, AZW3 or TXT", 1, -6)
    text("Tap to return", 2, -10)
    return
  end
  for index, path in ipairs(files) do
    local name = path:match("([^/]+)$") or path
    if #name > 34 then name = name:sub(1, 31) .. "..." end
    text(index .. ". " .. name, 1, -9 + (index * 2))
  end
  text("Tap a title to open in KOReader", 1, -13)
end

local function hit_menu(y)
  for _, item in ipairs(MENU) do
    if y >= item.top and y <= item.bottom then return item.action end
  end
  return "menu"
end

local fd = open_touch()
if fd < 0 then
  render_header("Input unavailable")
  text("No touchscreen event device", 2, -1)
  text("Tap or press a key to exit", 1, -6)
  C.usleep(3000000)
  os.exit(1)
end

local view = "menu"
local library_files = {}
render_menu()

while true do
  local x, y = wait_tap(fd)
  if not x then
    C.close(fd)
    os.exit(1)
  end
  if view == "menu" then
    local action = hit_menu(y)
    log("MENU: y=" .. y .. " action=" .. action)
    if action == "home" then
      view = "home"
      render_home()
    elseif action == "library" then
      library_files = list_documents()
      view = "library"
      render_library(library_files)
    elseif action == "weread" then
      C.close(fd)
      os.exit(30)
    elseif action == "koreader" then
      C.close(fd)
      os.exit(20)
    elseif action == "exit" then
      C.close(fd)
      os.exit(0)
    end
  elseif view == "home" then
    view = "menu"
    render_menu()
  elseif view == "library" then
    local selected = math.floor((y - LIBRARY_TOP) / LIBRARY_ROW_HEIGHT) + 1
    if selected >= 1 and selected <= #library_files then
      local path = library_files[selected]
      local marker = io.open("/mnt/us/moping-station-native-test.open", "w")
      if marker then marker:write(path); marker:close() end
      C.close(fd)
      os.exit(20)
    else
      view = "menu"
      render_menu()
    end
  end
end
