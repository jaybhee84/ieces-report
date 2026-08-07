"use strict";
const require$$0 = require("electron");
const require$$1 = require("path");
const require$$2 = require("fs");
require("os");
var main = {};
const { app, BrowserWindow, ipcMain, shell } = require$$0;
const path = require$$1;
const fs = require$$2;
const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
const dataDir = path.join(app.getPath("userData"), "ieces-data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dbFile = path.join(dataDir, "ieces.json");
function readDB() {
  try {
    if (fs.existsSync(dbFile)) return JSON.parse(fs.readFileSync(dbFile, "utf8"));
  } catch {
  }
  return { mooe: [], users: [{ username: "admin", password: "ieces2024", name: "Administrator" }] };
}
function writeDB(data) {
  fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
}
let win;
function createWindow() {
  win = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    },
    titleBarStyle: "default",
    title: "IECES Report Admin",
    show: false
  });
  if (isDev) {
    win.webContents.openDevTools();
    const loadDevServer = async () => {
      try {
        await win.loadURL("http://localhost:5173");
      } catch (err) {
        console.log("Dev server not ready, retrying in 1s...");
        setTimeout(loadDevServer, 1e3);
      }
    };
    loadDevServer();
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
  win.once("ready-to-show", () => win.show());
}
app.whenReady().then(createWindow);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
ipcMain.handle("auth:login", (_, { username, password }) => {
  const db = readDB();
  const user = db.users.find((u) => u.username === username && u.password === password);
  if (user) return { ok: true, name: user.name };
  return { ok: false };
});
ipcMain.handle("mooe:getAll", () => {
  const db = readDB();
  return db.mooe || [];
});
ipcMain.handle("mooe:save", (_, entry) => {
  const db = readDB();
  if (!db.mooe) db.mooe = [];
  const idx = db.mooe.findIndex((r) => r.sy === entry.sy && r.month === entry.month);
  entry.savedAt = (/* @__PURE__ */ new Date()).toISOString();
  if (idx >= 0) db.mooe[idx] = entry;
  else db.mooe.push(entry);
  writeDB(db);
  return { ok: true };
});
ipcMain.handle("mooe:delete", (_, { sy, month }) => {
  const db = readDB();
  db.mooe = (db.mooe || []).filter((r) => !(r.sy === sy && r.month === month));
  writeDB(db);
  return { ok: true };
});
ipcMain.handle("app:getVersion", () => app.getVersion());
module.exports = main;
