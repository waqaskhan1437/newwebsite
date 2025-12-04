/*
 * upload_bunny.js
 *
 * Upload a file (e.g., a product JSON) to Bunny CDN storage via the HTTP PUT
 * API. This script reads a local file and streams it to Bunny. Provide
 * environment variables or command‑line flags for the storage zone, access
 * key, region and destination file name. Based on the Bunny API documentation
 * which requires a PUT request with AccessKey and Content‑Type headers
 *【299689045478259†L264-L276】.
 */

const fs = require('fs');
const path = require('path');

// Node 18+ includes fetch; otherwise require('node-fetch')
const fetchFunc = (typeof fetch !== 'undefined') ? fetch : require('node-fetch');

function usage() {
  console.log('Usage: node upload_bunny.js --file ./path.json --zone STORAGE_ZONE --region REGION --key ACCESS_KEY [--dest filename.json]');
  process.exit(1);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i];
    const val = args[i + 1];
    switch (flag) {
      case '--file': opts.file = val; break;
      case '--zone': opts.zone = val; break;
      case '--region': opts.region = val; break;
      case '--key': opts.key = val; break;
      case '--dest': opts.dest = val; break;
      default:
        usage();
    }
  }
  if (!opts.file || !opts.zone || !opts.region || !opts.key) usage();
  if (!opts.dest) opts.dest = path.basename(opts.file);
  return opts;
}

async function upload() {
  const opts = parseArgs();
  const filePath = opts.file;
  const fileContent = fs.readFileSync(filePath);
  const url = `https://${opts.region}.bunnycdn.com/${opts.zone}/${opts.dest}`;
  const res = await fetchFunc(url, {
    method: 'PUT',
    headers: {
      AccessKey: opts.key,
      'Content-Type': 'application/json',
      accept: 'application/json'
    },
    body: fileContent
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Upload failed: ${res.status} ${text}`);
  }
  console.log('Upload successful');
  console.log(text);
}

upload().catch(err => {
  console.error(err);
  process.exit(1);
});