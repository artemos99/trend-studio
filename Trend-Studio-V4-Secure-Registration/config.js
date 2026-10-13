/* PUBLIC client configuration for Trend Studio.
   These values are meant to be included in a public GitHub Pages site.
   NEVER place a Supabase service_role/secret key or a Google client SECRET here.
   Fill in the values using SETUP.md. */
window.TREND_CONFIG = {
  supabaseUrl: '',           // https://YOUR-PROJECT.supabase.co
  supabasePublishableKey: '', // sb_publishable_... or legacy anon key (NOT secret/service_role)
  googleClientId: ''         // ...apps.googleusercontent.com (OAuth WEB CLIENT ID, NOT secret)
};
