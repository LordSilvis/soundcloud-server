# SoundCloud Download Server

Simple Node.js proxy server using yt-dlp to download SoundCloud tracks as MP3.

## Deploy on Render (free, ~3 minutes)

### Step 1 — GitHub
1. Go to **github.com** → New repository → Name it `soundcloud-server`
2. Upload these 3 files: `server.js`, `package.json`, `render.yaml`

### Step 2 — Render
1. Go to **render.com** → Sign up (free)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repo `soundcloud-server`
4. Render auto-detects the settings from `render.yaml`
5. Click **"Create Web Service"**
6. Wait ~2 min for the build → you get a URL like:
   ```
   https://soundcloud-dl.onrender.com
   ```

### Step 3 — Connect to your website
In your website's `index.html`, find this line in the JS:
```js
const SERVER = 'YOUR_SERVER_URL_HERE';
```
Replace `YOUR_SERVER_URL_HERE` with your Render URL, e.g.:
```js
const SERVER = 'https://soundcloud-dl.onrender.com';
```

## API Endpoints

**GET /info?url=SOUNDCLOUD_URL**  
Returns track title, artist, thumbnail.

**GET /download?url=SOUNDCLOUD_URL**  
Streams the MP3 file directly as a download.

## Notes
- Free Render plan spins down after 15 min inactivity → first request takes ~30s to wake up
- yt-dlp handles the actual downloading from SoundCloud
