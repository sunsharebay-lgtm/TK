const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("desktopShell", {
  isDesktop: true,
  platform: process.platform
});
