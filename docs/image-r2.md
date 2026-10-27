# Generated images on Cloudflare R2

Enable **Upload generated images to Cloudflare R2** in **Settings → General**,
fill in the R2 fields, then click **Save**. This is independent of R2 backups
and WebDAV storage. R2 upload is disabled by default.

The equivalent `config.json` section is:

```json
{
  "image_r2": {
    "enabled": false,
    "account_id": "YOUR_CLOUDFLARE_ACCOUNT_ID",
    "access_key_id": "YOUR_R2_ACCESS_KEY_ID",
    "secret_access_key": "YOUR_R2_SECRET_ACCESS_KEY",
    "bucket": "generated-images",
    "prefix": "chatgpt2api/images",
    "public_base_url": "https://images.example.com"
  }
}
```

Set `enabled` to `true` to upload new generated or edited images. Use credentials
with object read/write/delete and listing access to the chosen bucket. Configure
the bucket's public custom domain or public `r2.dev` URL separately in Cloudflare.
`public_base_url` must be the bucket origin, without an object directory, query
string or trailing path. The S3 endpoint (`*.r2.cloudflarestorage.com`) is for
authenticated API access and cannot serve as the public URL.

See [Cloudflare's public bucket documentation](https://developers.cloudflare.com/r2/buckets/public-buckets/).

When enabled:

- The existing local/WebDAV save still runs. Each new image is additionally
  uploaded under `<prefix>/YYYY/MM/DD/<timestamp>_<hash>.png` on R2.
- `/v1/images/generations`, `/v1/images/edits` and background image tasks return
  the public R2 link in `data[].url`, including streaming image results.
- The default `response_format: "b64_json"` continues to include Base64 alongside
  the public URL. Send `response_format: "url"` for URL-only image data.
- Image output in `/v1/chat/completions` uses a public Markdown image link.
  `/v1/responses` retains its Base64 `image_generation_call.result` contract.
- Upload failure fails the image request instead of silently returning a local
  link. The local/WebDAV copy may already have been saved.
- Existing images are not uploaded retroactively. The image manager continues
  using the existing local/WebDAV storage.

## Automatic cleanup

The backend starts an R2 cleanup worker with the application. It checks once on
startup, then every **3 hours (10,800 seconds)**. It lists all pages under the
configured prefix and deletes generated PNG objects whose R2 **LastModified**
timestamp is strictly older than **5 days (120 hours)**. An image exactly 5 days
old remains until a later sweep. Local and WebDAV copies are unaffected.

Only generated-image filenames inside the configured prefix qualify; unrelated
files and backup objects are skipped. Invalid/missing timestamps are skipped.
An individual delete failure is logged and does not stop the remaining cleanup;
failed objects are retried on the next sweep. Cleanup logs use
`image_r2_cleanup`, `image_r2_cleanup_failed` and `image_r2_delete_failed` events.

Set `enabled` to `false` to stop both uploads and R2 cleanup. Configuration
changes made through Settings apply without restarting. Direct edits to
`config.json` require restarting the backend. Keep the backend running for the
scheduled checks; if it was offline, the startup sweep catches expired images.
Changing the bucket or prefix means future sweeps only cover the new location.
Objects are normally deleted between 5 days and 5 days plus one cleanup interval
after upload while the backend is running.
