# Social previews

The current public origin is https://0161active.co.uk. The homepage's canonical and Open Graph URL is https://0161active.co.uk/.

Every full HTML page has static Open Graph and Twitter card metadata in its head. All pages use `img/0161 Active_Logo.png` as the share image. Each generated sport and club page has its own title and description. Sharing services can read these tags without executing JavaScript.

After editing page descriptions or club data, rebuild the static pages and metadata:

```sh
node scripts/build-site-metadata.cjs
```

The Node generator is the sole writer of page metadata and canonical URLs. The retired image generator has been removed. Its old cards remain in `archive/artwork/social/`, outside the published folder. Requests for former `/img/social/` URLs redirect to the current logo so older cached shares retain an image.

For a public-domain change, update `publicUrl` in `data/site.json` and run the Node generator. Deploy the updated HTML, logo, redirects, sitemap.xml and robots.txt together. Domain changes should also redirect the old domain through the hosting provider. See site-maintenance.md for the verification and indexing policy.

The root _redirects file contains Netlify permanent redirects from /index.html and /index to /. Keep that file in the published directory. Local Python preview servers do not process Netlify redirect rules.
