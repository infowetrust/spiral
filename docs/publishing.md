# Publishing

Target: https://spiral.infowetrust.com/

Repository: `infowetrust/spiral`. GitHub Pages serves the root of `main`.
`.nojekyll` bypasses Jekyll; this is a plain static app with no build step.
`CNAME` holds the custom domain. There are no production API keys or servers.

## Initial Setup

1. Create the repository and push `main`.
2. In Settings > Pages, select Deploy from a branch, `main`, `/ (root)`.
3. Set the custom domain to `spiral.infowetrust.com` before adding its DNS record.
4. At the DNS provider, add CNAME host `spiral`, target `infowetrust.github.io`.
   Do not include the repository path or change apex, mail, or wildcard records.
5. Verify the domain in the GitHub account's Pages settings using GitHub's
   generated TXT record when possible. Keep that TXT record afterward.
6. Once DNS and the certificate are ready, enable Enforce HTTPS.
7. Check the live page, event/weather modes, source links, and downloads.

The existing domain uses Bluehost nameservers. DNS and HTTPS certificate issuance
can take time; the target URL is not proof that deployment is complete.

## Subsequent Updates

Follow the [data update guide](updating-data.md) for acquisition commands,
manual event research, coverage checks, tests, and deployment verification.
Run the data scripts only when intentionally updating snapshots. Commit the
reviewed changed files and push `main`.
GitHub Pages publishes the new commit automatically. Data does not refresh by
itself, and no scheduled data collection is configured.

Ignored caches, raw downloads, and test screenshots remain local. The source
repository is public; never commit credentials or unpublished private data.

Official setup reference:
https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site
