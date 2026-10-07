# Social previews

The current public origin is https://0161active.co.uk. The homepage's canonical and Open Graph URL is https://0161active.co.uk/.

Every full HTML page has static Open Graph and Twitter card metadata in its head, plus a 1200 × 630 JPEG in img/social. Static tags allow sharing services to read metadata without executing JavaScript. The shared sport glossary has a general preview because its sport selection is driven by query parameters and JavaScript.

To refresh cards after editing page descriptions or club data, generate profiles, generate images with a Python environment containing Pillow, then rebuild metadata to link any new cards:

```sh
node scripts/build-site-metadata.cjs
python3 scripts/generate-social-previews.py
node scripts/build-site-metadata.cjs
```

The Node generator is the sole writer of page metadata and canonical URLs. The Python script writes images only and reads each generated profile's sport/area eyebrow, keeping share cards aligned with the approved postcode rules. It currently uses macOS Arial fonts and the native `sips` decoder when Pillow cannot decode an AVIF file.

For a public-domain change, update `publicUrl` in `data/site.json` and run the Node generator. Image generation is needed when card text or photos change. Deploy the updated HTML, img/social, sitemap.xml and robots.txt together. Domain changes should also redirect the old domain through the hosting provider. See site-maintenance.md for the verification and indexing policy.

The root _redirects file contains Netlify permanent redirects from /index.html and /index to /. Keep that file in the published directory. Local Python preview servers do not process Netlify redirect rules.
