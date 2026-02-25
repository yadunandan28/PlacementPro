// ============================================================
//  HOW TO CREATE YOUR .env FILE  (Windows PowerShell)
//
//  Run this in your terminal inside the server/ folder:
//
//  Step 1:  Rename-Item .env.example .env
//  Step 2:  Open .env in VS Code:  code .env
//  Step 3:  Fill in your MongoDB URL and save
//
// ============================================================

// This file just prints setup instructions — it is NOT the .env file.
// See .env.example for the actual template.

console.log(`
╔══════════════════════════════════════════════════════╗
║           PlacementPro — .env Setup Helper           ║
╚══════════════════════════════════════════════════════╝

You need to create a .env file in the server/ folder.

WINDOWS (PowerShell):
  Rename-Item .env.example .env
  code .env

MAC / LINUX (Terminal):
  cp .env.example .env
  code .env

Then fill in these 3 required values:

  MONGO_URI        → your MongoDB Atlas connection string
  JWT_ACCESS_SECRET  → any long random string (e.g. placementpro_secret_key_2024)
  JWT_REFRESH_SECRET → any other long random string

Get free MongoDB at: https://cloud.mongodb.com
`);
