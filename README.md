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
Le schéma de la base est dans `supabase/migrations/001_comptes.sql` :

- `profiles` : nom, nom d'utilisateur unique, bio, couleur, genres, rôle (`user` ou `creator`)
- personne ne peut modifier son propre rôle ; seule la fonction `set_creator` (réservée aux créateurs) le fait, et il reste toujours au moins un créateur
- `delete_my_account` supprime le compte et le profil

Vide `config.js` pour faire tourner Musio sans comptes en ligne (mode local).

## Structure

| Fichier | Rôle |
|---|---|
| `index.html` | point d'entrée |
| `core.js` | état, stockage local, rendu de base, icônes, logo |
| `views.js` / `overlays.js` | écrans et fenêtres |
| `actions.js` | interactions |
| `auth.js` / `config.js` | comptes en ligne (Supabase) |
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
