# Rota Backend

This project provides the backend API for the event application. Start the server with

```
npm start
```
## Configuration

Copy `.env.example` to `.env` and provide values for the following variables:

- `MONGO_URL` - MongoDB connection string used by the server and maintenance scripts

- `PORT` - port to run the server locally (defaults to 5000). In Azure the
  platform sets this automatically so you can normally omit it in production.
- `JWT_SECRET` - secret for signing access tokens
- `JWT_REFRESH_SECRET` - secret for signing refresh tokens
- `GOOGLE_MAPS_API_KEY` - Google Maps API key
- `EMAIL_USER` - e-mail account used for sending messages
- `EMAIL_PASS` - password for the e-mail account
- `CLIENT_BASE_URL` - base URL of the frontend used in e-mails
### Azure App Service

When deploying to Azure App Service the platform provides the `PORT`
environment variable automatically (usually `8080`).
Do **not** set a different `PORT` value in the production environment or the
application may fail to start.

Maintenance utilities in `scripts/` such as `fixCoordinates.js` also rely on the
same `.env` configuration.

## Scheduled cleanup

Old events are automatically removed by a cron job defined in `jobs/deleteOldEvents.js`.
The cron runs every night at 00:01 **as long as the application process is running**.
At startup the cleanup job is also executed once immediately.

## Image caching

Images are served from the `/img` endpoint in `public/img`. The Express server
sets a `Cache-Control` header with a 30&nbsp;day `max-age` and the `immutable`
flag so browsers can aggressively cache them.

For even better performance you can upload the contents of `public/img` to a CDN
(e.g. Amazon CloudFront or Cloudflare) and point your frontend at that URL. The
server's caching headers work well with most CDNs.


## Event query caching

Event listings fetched via `/api/etkinlik/tum` are cached in memory using
[`node-cache`](https://www.npmjs.com/package/node-cache). Cached entries live
for **300 seconds** (5&nbsp;minutes) before expiring. This TTL avoids unlimited
memory growth while keeping database load low. The value can be changed in
`service/eventService.js`.