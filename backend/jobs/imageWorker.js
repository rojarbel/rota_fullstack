const { parentPort } = require('worker_threads');
const sharp = require('sharp');

parentPort.on('message', async ({ filePath }) => {
  try {
    await sharp(filePath)
      .resize({ width: 1024 })
      .jpeg({ quality: 80 })
      .toFile(filePath);

    parentPort.postMessage({ success: true, filePath });
  } catch (err) {
    parentPort.postMessage({ success: false, error: err.message });
  }
});