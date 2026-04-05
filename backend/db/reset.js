const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "lline.db");

if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log("Base de datos eliminada:", dbPath);
} else {
  console.log("No existe base previa. Se creara al arrancar el servidor.");
}

