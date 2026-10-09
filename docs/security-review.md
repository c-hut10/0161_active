# Static site security review — 9 October 2026

## Completed local checks

- Pattern-based secret scan: 197 current text files and 1,317 historical Git blobs; no matches. Patterns cover common provider tokens, private keys, assigned credentials and credentials embedded in URLs. This is not proof that every secret is absent; remote commits not present locally were not inspected.
- No user authentication, private database, custom API, file-upload field or webhook receiver is present.
- Public renderers escape HTML text; online profile URLs are limited to HTTP/HTTPS. Registration previews use textContent.
- Questionnaire validation, CSV import validation, honeypot and reCAPTCHA configuration are present. Browser validation alone is bypassable.
- Local storage holds accessibility preferences and privacy-notice acknowledgement, not authentication tokens.
- No browser logging of submitted form answers was found.

## Deployment preparation

`netlify.toml` builds the pages and packages the public site into `dist`. Only deploy this output folder. Internal documents, scripts, templates, CSV exports, editor settings and geocoding caches are excluded. The root homepage is copied; no new source index page is introduced.

`.gitignore` excludes future environment files, private keys, Netlify settings, deployment output and a `private-imports` folder for response exports. Ignore rules do not remove previously committed files or protect files deliberately added with force.

`_headers` applies content-type protection, framing restrictions, referrer limits and a CSP allowing local assets, Google Fonts and Google reCAPTCHA. Inline scripts/styles remain permitted for compatibility with existing inline styles and Netlify's generated reCAPTCHA setup; this reduces the strength of the CSP against injected inline scripts. A stricter policy needs a separate compatibility review.

The paused map's external requests are not allowed by this policy. Review the policy before restoring the map or adding external integrations.

## Owner checks still required before release

- Check the actual Netlify environment variables, form spam controls, retention and team access. Do not publish private values through browser code or public JSON.
- Confirm GitHub and Netlify account access and enable multifactor authentication where available.
- Only approve a CSV import after checking the club's identity and submitted details. The existing importer marks approved imports verified and records the import date; it does not verify mailbox ownership.
- After deploying `dist`, inspect response headers and check registration/reCAPTCHA, fonts, navigation and downloads in the live site. Local preview does not emulate Netlify headers or Forms.
- Check that direct requests to internal documents, exports and cache files return 404. Files removed from future deployments can still exist in old deploy snapshots or Git history.
- Review any dashboard-installed integrations and logging separately. No authenticated dashboard inspection was performed.

No deployment, remote Git history rewrite or live submission was performed during this review. This is a local security review, not a penetration test or a guarantee of security.
