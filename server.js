const express = require('express');
const cors = require('cors');
const { exec, execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

// Allow requests from anywhere (your website)
app.use(cors());
app.use(express.json());

// ── Health check ──────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'SoundCloud Download Server running' });
});

// ── Get track info (title, artist, thumbnail) ─────────────────
app.get('/info', async (req, res) => {
  const url = req.query.url;
  if (!url || !url.includes('soundcloud.com')) {
    return res.status(400).json({ error: 'Invalid SoundCloud URL' });
  }

  exec(
    `yt-dlp --dump-json --no-download "${url}"`,
    { timeout: 20000 },
    (err, stdout, stderr) => {
      if (err) {
        return res.status(500).json({ error: 'Could not fetch track info', detail: stderr });
      }
      try {
        const data = JSON.parse(stdout);
        res.json({
          title: data.title || 'Unknown Title',
          artist: data.uploader || data.creator || 'Unknown Artist',
          thumbnail: data.thumbnail || null,
          duration: data.duration || null,
        });
      } catch (e) {
        res.status(500).json({ error: 'Failed to parse track info' });
      }
    }
  );
});

// ── Download MP3 ──────────────────────────────────────────────
app.get('/download', (req, res) => {
  const url = req.query.url;
  if (!url || !url.includes('soundcloud.com')) {
    return res.status(400).json({ error: 'Invalid SoundCloud URL' });
  }

  // Create a temp directory for this download
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scdl-'));
  const outputTemplate = path.join(tmpDir, '%(title)s.%(ext)s');

  console.log(`Downloading: ${url}`);

  exec(
    `yt-dlp -x --audio-format mp3 --audio-quality 0 -o "${outputTemplate}" "${url}"`,
    { timeout: 120000 },
    (err, stdout, stderr) => {
      if (err) {
        console.error('yt-dlp error:', stderr);
        cleanup(tmpDir);
        return res.status(500).json({ error: 'Download failed', detail: stderr.slice(0, 300) });
      }

      // Find the downloaded file
      let files;
      try {
        files = fs.readdirSync(tmpDir).filter(f => f.endsWith('.mp3'));
      } catch (e) {
        cleanup(tmpDir);
        return res.status(500).json({ error: 'Could not read output directory' });
      }

      if (!files.length) {
        cleanup(tmpDir);
        return res.status(500).json({ error: 'No MP3 file found after download' });
      }

      const filePath = path.join(tmpDir, files[0]);
      const fileName = files[0];

      // Stream it to the client
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);

      const stream = fs.createReadStream(filePath);
      stream.pipe(res);

      stream.on('end', () => {
        cleanup(tmpDir);
        console.log(`Served: ${fileName}`);
      });

      stream.on('error', (e) => {
        console.error('Stream error:', e);
        cleanup(tmpDir);
      });

      // Cleanup if client disconnects early
      req.on('close', () => cleanup(tmpDir));
    }
  );
});

function cleanup(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (e) {
    // ignore
  }
}

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
