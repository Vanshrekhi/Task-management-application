import mongoose from "mongoose";
import dns from "node:dns";

// Helps on some Windows / dual-stack networks where SRV lookups fail oddly
if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

const connectOpts = {
  serverSelectionTimeoutMS: 15_000,
  // Prefer IPv4; can fix querySrv / connection issues on some networks
  family: 4,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const printMongoTroubleshoot = (err) => {
  const msg = String(err?.message || err);
  if (msg.includes("querySrv") || msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND")) {
    console.error(`
[MongoDB] Connection failed (often DNS / network / Atlas access).

Try:
  1. Confirm internet and that Atlas cluster is running (MongoDB Atlas dashboard).
  2. Atlas → Network Access: allow your current IP (or 0.0.0.0/0 for dev only).
  3. If \`mongodb+srv://\` keeps failing, use Atlas "Connect" → choose the
     standard (non-SRV) connection string and set it as MONGODB_URI, or set
     MONGODB_URI_ALT as a second URI to try (see connectDB.js).
  4. VPN / corporate DNS: try another network or disable VPN briefly.
`);
  }
};

const dbConnection = async () => {
  mongoose.set("bufferCommands", false);

  const primary = process.env.MONGODB_URI;
  const alt = process.env.MONGODB_URI_ALT;
  const uris = [primary, alt].filter(Boolean);

  if (!uris.length) {
    throw new Error("MONGODB_URI is not set");
  }

  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    for (const uri of uris) {
      try {
        if (mongoose.connection.readyState === 1) {
          console.log("Database Connected");
          return;
        }
        await mongoose.connect(uri, connectOpts);
        console.log("Database Connected");
        return;
      } catch (error) {
        lastErr = error;
        console.error(`DB Error (attempt ${attempt + 1}):`, error?.message || error);
        if (mongoose.connection.readyState !== 0) {
          await mongoose.disconnect().catch(() => {});
        }
      }
    }
    if (attempt < 2) await sleep(2000);
  }

  printMongoTroubleshoot(lastErr);
  throw lastErr;
};

export default dbConnection;
