// Connexion au serveur de comptes (Supabase).
// Ces deux valeurs sont publiques : elles sont faites pour être dans l'appli.
// La sécurité des données est assurée par les règles de la base (voir supabase/migrations).
// Laisse-les vides pour faire tourner Musio en mode local, sans comptes en ligne.
window.MUSIO_CONFIG = {
  supabaseUrl: 'https://ahvtqanpeuzfcrrcivxp.supabase.co',
  supabaseAnonKey: 'sb_publishable_duS_NKm6ZKZ3h8y5R_4jpg_9bfUo1vD',
  // Anti-robots : clé de site Cloudflare Turnstile (publique). Vide = pas de captcha.
  // La clé secrète correspondante se met dans Supabase › Authentication › Attack Protection.
  turnstileSiteKey: '',
};
