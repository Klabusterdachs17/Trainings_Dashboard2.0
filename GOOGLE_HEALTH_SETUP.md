# Google Health read-only setup

The PWA stores workout plans and history in the browser. Google Health OAuth runs in Vercel Functions; Google tokens are encrypted with AES-256-GCM and stored per browser session in Upstash Redis. Only the `activity_and_fitness.readonly` scope is requested. Workout sessions are limited to Google wearable sources; zone intervals use the reconciled API view to reduce overlapping duplicates. Imported workout summaries are saved in the existing local workout record and therefore remain part of JSON export/import.

## Vercel environment variables

Configure these in the Vercel project settings. Do not commit values or paste secrets into chat.

| Variable | Value |
| --- | --- |
| `GOOGLE_HEALTH_CLIENT_ID` | OAuth 2.0 Web application client ID |
| `GOOGLE_HEALTH_CLIENT_SECRET` | OAuth client secret |
| `GOOGLE_HEALTH_REDIRECT_URI` | `https://<production-host>/api/google/callback` |
| `HEALTH_TOKEN_ENCRYPTION_KEY` | Base64 encoding of 32 random bytes |
| `UPSTASH_REDIS_REST_KV_REST_API_URL` | Vercel Upstash integration REST URL with custom prefix `UPSTASH_REDIS_REST` |
| `UPSTASH_REDIS_REST_KV_REST_API_TOKEN` | Vercel Upstash integration write-capable REST token with the same prefix |

The server also accepts `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` if those direct names are configured. Do not use the `READ_ONLY_TOKEN`: this app must write and delete encrypted OAuth sessions. The Vercel integration adds its provider suffix after your custom prefix, which is why its variables include `KV_REST_API`.

Generate the encryption key locally with Node.js:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Create/connect an Upstash Redis database to the Vercel project and use the REST URL and token that Vercel injects. Apply the variables to Production and redeploy. The OAuth callback URL must also be added to the Google OAuth client's authorized redirect URIs.

## Google Cloud setup

1. Create a separate Google Cloud project for initial testing and enable Google Health API.
2. Create an OAuth client for a web application and add the production callback URL above as an authorized redirect URI.
3. Add only `https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly` to the OAuth data access scopes.
4. Keep OAuth publishing status in Testing and add the Google account used by the Pixel Watch as a test user.
5. In the Google Health mobile app, sign in with that same Google account and make sure its Health profile is linked.

While the OAuth app is in Testing, Google refresh tokens may expire after seven days, so reconnecting can be required during the prototype phase. Avoid using a production OAuth project for development.

## First connection check

Open **Mehr → Pixel Watch verbinden**, complete Google consent, then finish a watch-recorded Workout in the PWA. The app searches nearby Google wearable workout sessions, asks you to confirm the right one, and stores elapsed time, active duration, total Zone Minutes, and the Fat Burn/Cardio/Peak breakdown. A missing match can be retried from the workout's history card after the watch has synced.

The PWA's workout plan and history are not uploaded to Google. Disconnecting removes the server-side OAuth session; values already imported into the local workout history stay there.
