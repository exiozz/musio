// Connexion au serveur de comptes (Supabase).
// Ces deux valeurs sont publiques : elles sont faites pour être dans l'appli.
// La sécurité des données est assurée par les règles de la base (voir supabase/migrations).
// Laisse-les vides pour faire tourner Musio en mode local, sans comptes en ligne.
window.MUSIO_CONFIG = {
  supabaseUrl: 'https://mxvmsldkrzcgabtcaseb.supabase.co',
  supabaseAnonKey: 'sb_publishable_MEb2FSMIOqmQL6f1UsBa0Q_9c1lzu2g',
  // Anti-robots : clé de site Cloudflare Turnstile (publique). Vide = pas de captcha.
  // La clé secrète correspondante se met dans Supabase › Authentication › Attack Protection.
  turnstileSiteKey: '',
};
