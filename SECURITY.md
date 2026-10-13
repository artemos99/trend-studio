# Trend Studio security

This repository is intended for a **read-only YouTube dashboard**. The secure deployment bundle does not request `youtube.upload` or any YouTube edit/delete scopes. Finished compilation videos are exported locally and uploaded manually in YouTube Studio.

**Never commit:** Google OAuth client secrets, Supabase service-role/secret keys, passwords, tokens, refresh tokens, .env files, raw source videos, user exports, private analytics, or credentials.

Only these values belong in public `config.js`: Supabase project URL, Supabase **publishable** key, Google OAuth **web client ID**. Public OAuth client IDs are not passwords; Google auth approval still occurs on Google's site.

Before connecting your channel:

1. Enable GitHub and Google two-factor authentication/passkeys.
2. Enforce Supabase Row Level Security, email verification, strong passwords, and rate limits.
3. Keep YouTube consent read-only; do not approve publish/edit/delete scopes.
4. Use Google OAuth app Testing status initially and limit test users.
5. Never treat a public static site as private even when it has a login page.

This code is a prototype and cannot guarantee protection from every vulnerability. Review future code changes before deploying. If suspicious activity occurs, revoke Trend Studio Google OAuth permissions from Google's Third-party connections and secure the account immediately.
