# Musio

**La musique, ensemble.** Écoute, publie des vidéos et des photos en musique, vois ce qu'écoutent tes amis sur la Map, fais des matchs musicaux, discute en messages et en communautés.

Musio est une application web installable (PWA) : elle s'ajoute à l'écran d'accueil comme une vraie app et s'ouvre même sans connexion.

## Essayer

👉 **https://exiozz.github.io/musio/**

- **iPhone** : ouvre le lien dans Safari › bouton Partager › *Sur l'écran d'accueil*
- **Android** : ouvre le lien dans Chrome › menu ⋮ › *Installer l'application*
- **Ordinateur** : dans Chrome ou Edge, icône d'installation dans la barre d'adresse

## Fonctionnalités

- Comptes avec e-mail et mot de passe (Supabase) : inscription, confirmation par e-mail, mot de passe oublié, déconnexion, suppression du compte
- Anti-robots Cloudflare Turnstile et « Continuer avec Apple / Google » (affichés dès qu'ils sont activés)
- Communautés en ligne : création, découverte, rejoindre/quitter, messages en direct, modération par le fondateur
- Publication de sons : tes sons importés peuvent être mis en ligne et écoutés par tous (Supabase Storage)
- Panel admin (créateurs) : statistiques, comptes (rôle, suspension), signalements, modération, boosts
- Liens partageables pour les sons et les communautés (`#son-…`, `#commu-…`)
- Vraie carte (MapLibre + OpenFreeMap, gratuite et sans clé) avec ta position arrondie au quartier
- Rôle « Créateur de Musio » : badge sur le profil, attribué ou retiré par un autre créateur (Réglages › Créateurs de Musio)
- Lecteur complet : file d'attente, aléatoire, répétition, paroles, minuterie de sommeil, fond aux couleurs de la pochette
- Import de tes propres sons (MP3, M4A, WAV…) avec lecture des titres, artistes et pochettes intégrés
- Feed vidéo et photo, échos, commentaires, partages
- Map des amis, Match musical, messages et communautés
- Réglages, consentements, export et suppression des données, textes légaux

## Lancer en local

Aucune installation : c'est du HTML, du CSS et du JavaScript sans build.

```bash
python3 -m http.server 8000
# puis ouvre http://localhost:8000
```

## Comptes (Supabase)

`config.js` contient l'adresse du projet Supabase et sa clé publique (elles peuvent être publiques : la sécurité repose sur les règles de la base).
Le schéma de la base est dans `supabase/migrations/` (comptes, communautés, sons, durcissement) :

- `profiles` : nom, nom d'utilisateur unique, bio, couleur, genres, rôle (`user` ou `creator`)
- personne ne peut modifier son propre rôle ; seule la fonction `set_creator` (réservée aux créateurs) le fait, et il reste toujours au moins un créateur
- `delete_my_account` supprime le compte et le profil
- `communities`, `community_members`, `community_posts` : 10 communautés max par personne, il faut être membre pour écrire
- `tracks` + buckets `sounds` / `covers` : chacun dépose ses fichiers dans son dossier, 20 Mo et 100 sons max par compte, droits certifiés
- `reports`, `boosts`, `admin_stats`, `admin_ban` (005) : signalements en ligne, mise en avant pendant une durée, suspension de comptes
- `follows` (006) : abonnements en ligne (qui suit qui), visibles par les membres connectés
- `posts` + bucket `posts` (009) : publications du feed (photos, vidéos 50 Mo max) visibles par tous (Public) ou par les personnes que l’auteur suit (Amis) ; « Moi seulement » reste sur l’appareil
- `presence` (008) : position arrondie (~100 m) et son en cours pour la Map, visible uniquement par les personnes que tu suis ; le mode fantôme la retire

Vide `config.js` pour faire tourner Musio sans comptes en ligne (mode local).

## Structure

| Fichier | Rôle |
|---|---|
| `index.html` | point d'entrée |
| `core.js` | état, stockage local, rendu de base, icônes, logo |
| `views.js` / `overlays.js` | écrans et fenêtres |
| `actions.js` | interactions |
| `cloud.js` | communautés et sons en ligne |
| `admin.js` | panel admin, boosts, liens partageables |
| `auth.js` / `config.js` | comptes en ligne (Supabase), anti-robots, Apple / Google |
| `vendor/maplibre/` | moteur de carte (MapLibre GL, licence BSD) |
| `audio.js` | moteur audio (Web Audio API) |
| `data.js` | contenu de démonstration |
| `legal.js` | textes légaux (modèles à compléter) |
| `supabase/migrations/` | schéma de la base |
| `sw.js` / `manifest.webmanifest` | fonctionnement hors ligne et installation |

Après une modification, change `VERSION` dans `sw.js` pour que les utilisateurs reçoivent la nouvelle version.

## Avant une vraie mise en ligne publique

- Les comptes et profils sont en ligne. Les publications, messages, abonnements et sons importés sont encore gardés **sur l'appareil** : prochaine étape, les passer dans Supabase.
- Configure un service d'envoi d'e-mails (SMTP) dans Supabase : sans lui, les e-mails de confirmation ne partent qu'aux membres de l'équipe du projet.
- Les textes de `legal.js` sont des modèles : complète les éléments entre crochets et fais-les valider par un juriste.

## Licence

© Musio. Tous droits réservés. `vendor/jsmediatags.min.js` et `vendor/supabase.min.js` sont distribués sous leurs propres licences (voir les fichiers `-LICENSE.txt` dans `vendor/`).
