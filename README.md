# Lumen Labs website

A responsive, accessible company website using the supplied Lumen Labs logo, with navy and amber branding, STEWARD capability previews, optional spoken examples, company information, FAQs and a working enquiry form.

## Local preview

Requires Node.js 22.12 or later. No packages need installing. The preview and test scripts enable Node's built-in SQLite module.

```sh
npm run dev
```

Open http://127.0.0.1:4173. The local enquiry form writes to `.preview/enquiries.sqlite`; production uses the Sites-managed D1 `DB` binding. These databases are separate. Stop the server with Ctrl+C.

## Checks and build

```sh
npm test
npm run build
```

The build bundles the HTML, CSS, JavaScript, logo and favicon into a dependency-free Worker at `dist/server/index.js`. The source of the Worker is `worker/handler.mjs`; schema migrations are in `drizzle/`.

## Enquiries and email

Contact links and prefilled email copies use **lumenlabs@gmail.com**. The form validates and stores enquiries with a reference number. It does **not** send an automatic email notification. After saving, visitors may email a copy using their own mail application. The team can read saved enquiries through the Sites database tools; records are never exposed through a public read endpoint. Automatic email delivery requires a configured email provider.

Submission protections include server validation, consent, same-origin checks, a honeypot, payload limits, per-email rate limiting, parameterized SQL and safe retries.

## Source and deployment

Edit `index.html`, `styles.css`, and `app.js`. Keep `image.png` as the original supplied logo. `.openai/hosting.json` holds the private Sites identity and database binding. Deploy through the Sites source workflow. The previous site is preserved locally in `.original/` and excluded from publication.

Product artwork is a concept illustration. The audio and visual capability previews are illustrative, not live STEWARD output. Prototype statistics, team names and development status are retained from the original supplied website.
