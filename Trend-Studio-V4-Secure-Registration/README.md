# Trend Studio V4 · Secure registration & video explorer

Prepared for GitHub Pages: https://artemos99.github.io/trend-studio/

## What's included
- Click **Sign in** in the upper right to open the registration / login dialog.
- Register with email + password (12+ characters), confirm email and enroll **authenticator-app 2FA** using QR code. Subsequent logins prompt for six-digit authenticator code. Google sign-in uses Supabase Google OAuth and then the same app-level 2FA requirement.
- YouTube read-only connection uses Google Identity Services and these read-only scopes only: `youtube.readonly`, `yt-analytics.readonly`.
- Scan the channel and competitors to load real thumbnails, playable video previews, public views/likes, public channel subscriber/view/video counts; see owned-video watch time and retention (when YouTube returns them). Demo placeholders and metrics are labeled sample data.
- Existing Compilation Studio, Idea Vault, planner and competitor tracking remain.

## Mandatory configuration (DO THIS BEFORE PROMOTING THE SITE)

1. Upload `index.html`, `app.js`, `cloud.js`, `config.js`, `schema.sql`, `.nojekyll` to the root of the public GitHub repo `artemos99/trend-studio`. Do NOT upload service-role keys, `.env`, credentials, private source footage, or video exports.
2. GitHub repository → Settings → Pages → Deploy from branch → `main` / (root). Wait for the published site.
3. Create a free Supabase project: https://supabase.com/dashboard/projects . Enable **email confirmations** and TOTP MFA (Authentication → MFA). Run **the updated `schema.sql`** in SQL Editor: this makes **AAL2 mandatory** to read/write saved workspaces (2FA is enforced at database level, not just displayed in a modal).
4. Supabase → Authentication → URL Configuration: set Site URL and Redirect URLs to `https://artemos99.github.io/trend-studio/` (and match exact trailing slash with actual host).
5. Supabase → Authentication → Providers → Google: enable; in Google Cloud create a Web OAuth client for Supabase Auth, and add the **Supabase OAuth callback URL** shown by Supabase as an Authorized Redirect URI. Put the Google OAuth **client secret only in Supabase**. This handles website Google sign-in.
6. For connecting YouTube, create a **separate** Google Cloud OAuth Web Client for the site's read-only YouTube connection. Authorized JavaScript origin: `https://artemos99.github.io` (origin only, no path). Enable YouTube Data API v3 and YouTube Analytics API. The consent screen may need Testing mode with the Google account added as a test user, or Google OAuth verification for broader public use. Google access tokens remain in memory, never in the workspace database.
7. Set ONLY these **public** values in `config.js`: `supabaseUrl`, `supabasePublishableKey`, and `googleClientId` for the *read-only YouTube Web client*. The Supabase Google sign-in Web OAuth client is configured separately in Supabase. Public client IDs and publishable key are not private credentials, but should have domain restrictions where supported.
8. Enable 2FA/passkeys on your main Google and GitHub accounts. Maintain Supabase MFA enrollment recovery procedures (Supabase TOTP does NOT provide recovery codes; losing the device may require admin recovery), secure custom email delivery for production use, and restrict Supabase Auth abuse/rate limits and signup settings.

## Security limitations and API boundaries
- **No YouTube upload/edit/delete scopes** are present, so Trend Studio cannot change, publish or delete any channel videos. Source videos and render files stay local. Authorized Analytics are for owned channels; competitor watch time, retention, CTR, revenue and rewatch heatmaps are not publicly accessible.
- The free GitHub Pages website is public static source code. An account gates private **database content** under Supabase RLS, not the website files. Don't publish secrets in GitHub.
- Google YouTube tokens live only in the current browser tab's memory and expire/re-prompt. Supabase sessions are stored in sessionStorage (they are per-tab and re-authentication may be needed). Authenticator second factor required for workspace data.
- YouTube iframe embeds may be disabled by creators. Use **Open on YouTube** when a video cannot play inline.
- This is a working frontend prototype. Production deployment still needs a security review, access audits, anti-abuse provisions, analytics/API quota monitoring, and end-to-end OAuth testing with your own credentials. No code can guarantee that a Google account is unhackable.
