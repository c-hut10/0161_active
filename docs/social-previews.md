# Social previews

The current public origin is https://0161active.co.uk. The homepage's canonical and Open Graph URL is https://0161active.co.uk/.

Every full HTML page has static Open Graph and Twitter card metadata in its head, plus a 1200 × 630 JPEG in img/social. Navigation fragments are excluded. Static tags allow sharing services to read metadata without executing JavaScript. The shared sport glossary has a general preview because its sport selection is driven by query parameters and JavaScript.

To change the public domain or refresh cards after editing page descriptions or club data, run scripts/generate-social-previews.py with a Python environment containing Pillow:

```sh
python3 scripts/generate-social-previews.py --site-url https://your-new-domain.com
node scripts/build-site-metadata.cjs
```

The image generator saves the origin in data/site.json, which the metadata generator also uses. It currently uses macOS Arial fonts. Deploy the updated HTML, img/social, sitemap.xml and robots.txt together. Domain changes should also redirect the old domain through the hosting provider. See site-maintenance.md for the verification and indexing policy.

The root _redirects file contains Netlify permanent redirects from /index.html and /index to /. Keep that file in the published directory. Local Python preview servers do not process Netlify redirect rules.
