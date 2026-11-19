# Musio

**La musique, ensemble.** Écoute, publie des vidéos et des photos en musique, vois ce qu'écoutent tes amis sur la Map, fais des matchs musicaux, discute en messages et en communautés.

Musio est une application web installable (PWA) : elle s'ajoute à l'écran d'accueil comme une vraie app et s'ouvre même sans connexion.

## Essayer

👉 **https://exiozz.github.io/musio/**

- **iPhone** : ouvre le lien dans Safari › bouton Partager › *Sur l'écran d'accueil*
- **Android** : ouvre le lien dans Chrome › menu ⋮ › *Installer l'application*
- **Ordinateur** : dans Chrome ou Edge, icône d'installation dans la barre d'adresse

## Fonctionnalités

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

## Structure

| Fichier | Rôle |
|---|---|
| `index.html` | point d'entrée |
| `core.js` | état, stockage local, rendu de base, icônes, logo |
| `views.js` / `overlays.js` | écrans et fenêtres |
| `actions.js` | interactions |
| `audio.js` | moteur audio (Web Audio API) |
| `data.js` | contenu de démonstration |
| `legal.js` | textes légaux (modèles à compléter) |
| `sw.js` / `manifest.webmanifest` | fonctionnement hors ligne et installation |

Après une modification, change `VERSION` dans `sw.js` pour que les utilisateurs reçoivent la nouvelle version.

## Avant une vraie mise en ligne publique

- Les données (compte, publications, messages) sont gardées **sur l'appareil** de chaque utilisateur. Les amis, profils et morceaux sont des données de démonstration : un serveur (comptes, base de données, stockage des médias, modération) est nécessaire pour un vrai réseau social.
- Les textes de `legal.js` sont des modèles : complète les éléments entre crochets et fais-les valider par un juriste.

## Licence

© Musio. Tous droits réservés. `vendor/jsmediatags.min.js` est distribué sous sa propre licence (voir `vendor/jsmediatags-LICENSE.txt`).
