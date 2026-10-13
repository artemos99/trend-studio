# Security policy (pre-production)

Current status: security-first prototype. Registration and YouTube OAuth are **not yet enabled** until you configure Supabase and Google Cloud. Never deploy a service-role key or Google client secret in this static website.

This build is read-only for YouTube. It does **not** request YouTube write permission and cannot upload, edit or delete videos. Anyone who obtains account access to this GitHub repository can still change its future code, so enable 2FA, carefully review future commits, and protect your Google authorization consent.

To revoke access: Google Account → Third-party connections → select Trend Studio/its OAuth project → remove access. Do the same for unknown apps. For YouTube account compromise, immediately secure the Google Account, sign out of sessions, rotate passwords and review channel permissions.

Never publicly disclose a Supabase service_role key, Google OAuth client secret, password, refresh token, or a screenshot containing any of those values.
