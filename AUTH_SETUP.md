# Trend Studio — Google sign-in & account security

Public site: https://artemos99.github.io/trend-studio/

## Administrator setup (one time)
1. Create or select a Supabase project at https://supabase.com/dashboard/projects. Do **not** place any database password or secret key in GitHub.
2. In its SQL Editor, run the latest **root /schema.sql**. The policy requires `aal2` from verified TOTP before users can read or change saved projects. It limits each row to its owner.
3. Supabase → Authentication → URL Configuration:
   - Site URL: `https://artemos99.github.io/trend-studio/`
   - Redirect URLs: `https://artemos99.github.io/trend-studio/`
4. Supabase → Authentication → Providers → Google: enable Google. Create a Google Cloud OAuth **Web application**; configure Google's **Authorized redirect URI** to the *Supabase OAuth callback URL* shown in the Google provider settings, NOT the GitHub Pages site. Enter Google client ID and Google **client secret** into **Supabase settings only**.
5. Enable email confirmation, a minimum strong-password requirement, email signup limits, abuse/rate limits, and MFA (TOTP) in Supabase. Test email confirmation and password recovery.
6. In root `config.js` enter the Supabase project's HTTPS URL and public `sb_publishable_...` API key only. Google signup via Supabase works without filling `googleClientId`: that field is a **separate** optional Google Identity Services OAuth client ID for *read-only YouTube* access.
7. Optional Cloudflare Turnstile (anti-bot): create a Turnstile widget for hostname `artemos99.github.io`, set its **public** site key in `turnstileSiteKey` of `config.js`, and put its **secret key** only in Supabase Auth → Bot and Abuse Protection. Turn on Supabase CAPTCHA once both pieces are configured. Bot verification is used on password registration/login/reset; Google login is governed by Google's own auth.
8. Open the live site in a new browser and confirm Google login, signup email verification, 2FA setup and challenge, device sign-in, sign-out, and private workspace isolation.

## Security principles
- Never commit: Google client secrets, service_role or secret API keys, refresh/access tokens, passwords, raw video files, and private Analytics exports.
- The public source is **not** a security boundary. The database's RLS + MFA claims are the security boundary for cloud workspace data.
- Google login does **not** automatically authorize YouTube. YouTube connection uses separate read-only consent and does not request video edit, upload, or deletion permissions.
- Cloudflare WAF/CDN cannot front a `github.io` hostname you do not control. A custom domain or hosting on Cloudflare Pages would be needed for WAF; Turnstile does not require a custom domain.
- If you lose your authenticator app, a trusted administrator must verify identity and recover account MFA through Supabase; do not implement an unverified bypass.

The frontend can be deployed before an Auth project exists, but it remains in guest mode until Supabase is configured. This is a prototype, not a guarantee of immunity from compromise.
