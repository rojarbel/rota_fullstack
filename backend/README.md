# Rota Backend

This project provides the backend API for the event application. Start the server with

```
npm start
```
## Configuration

Copy `.env.example` to `.env` and provide values for the following variables:

- `MONGO_URL` - MongoDB connection string
- `PORT` - port to run the server (defaults to 5000)
- `JWT_SECRET` - secret for signing access tokens
- `JWT_REFRESH_SECRET` - secret for signing refresh tokens
- `GOOGLE_MAPS_API_KEY` - Google Maps API key
- `EMAIL_USER` - e-mail account used for sending messages
- `EMAIL_PASS` - password for the e-mail account
- `CLIENT_BASE_URL` - base URL of the frontend used in e-mails

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
