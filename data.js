// Catalogue musical de Musio (morceaux générés en direct par le moteur audio).
// Aucun compte de démonstration : amis, profils, publications et messages viennent des vrais utilisateurs.
window.DATA = (() => {
  const tracks = [
    { id: 't1', title: 'Néons de minuit', artist: 'Lune Basse', genre: 'Électro', bpm: 124, root: 57, dur: 214, color: '#FF5C8A', shape: 'disc', c2: '#FFC24B',
      lyrics: [[8, 'Les rues s’allument quand tout s’endort'], [15, 'On danse encore sous les néons d’or'], [22, 'Ton ombre glisse sur le béton'], [29, 'Et la ville répète notre chanson'], [38, 'Minuit, minuit, on reste là'], [45, 'Le monde tourne, pas nous, pas ce soir-là'], [54, 'Néons de minuit'], [58, 'Garde-moi dans la nuit'], [62, 'Néons de minuit'], [66, 'Jusqu’à ce que tout s’enfuie'], [76, '(instrumental)'], [100, 'Les taxis passent, on ne les voit pas'], [107, 'J’ai ton rire en boucle dans la tête, comme ça'], [116, 'Néons de minuit'], [120, 'Garde-moi dans la nuit']] },
    { id: 't2', title: 'Café 7h12', artist: 'Mira Loft', genre: 'Lo-fi', bpm: 78, root: 50, dur: 168, color: '#FFC24B', shape: 'ring' },
    { id: 't3', title: 'Ciel de béton', artist: 'K.Rimo', genre: 'Rap', bpm: 88, root: 45, dur: 191, color: '#7C5CFF', shape: 'diamond',
      lyrics: [[6, 'J’regarde le ciel, il est gris comme mes baskets'], [12, 'Le quartier dort, moi j’écris sur la banquette'], [18, 'Des rêves en vrac, des rimes en cascade'], [24, 'On part de rien mais on vise la façade'], [31, 'Ciel de béton, j’y mets des couleurs'], [37, 'Chaque mesure, j’efface une douleur'], [44, 'Ciel de béton, on monte en silence'], [50, 'Un jour la ville dira qu’on avait de l’avance'], [60, '(instrumental)']] },
    { id: 't4', title: 'Plage arrière', artist: 'Les Cerfs-Volants', genre: 'Indie', bpm: 112, root: 52, dur: 203, color: '#2EC5FF', shape: 'dome',
      lyrics: [[7, 'Les pieds sur la plage arrière'], [13, 'La radio grésille, on s’en fout'], [19, 'On roule vers la mer'], [25, 'Avec le soleil plein les genoux'], [33, 'Et si on ne rentrait jamais ?'], [39, 'Juste toi, moi, l’été'], [46, 'Plage arrière, plage arrière'], [52, 'On laisse la ville derrière'], [60, '(instrumental)'], [84, 'Le sel sur les vitres, les cheveux en l’air'], [91, 'Plage arrière, plage arrière']] },
    { id: 't5', title: 'Velours', artist: 'Nadia Sol', genre: 'Chill', bpm: 92, root: 53, dur: 186, color: '#B8FF5C', shape: 'pill',
      lyrics: [[9, 'Parle-moi tout bas'], [15, 'Comme du velours sur ma voix'], [22, 'La nuit est lente, on a le temps'], [29, 'De se perdre doucement'], [38, 'Velours, velours'], [44, 'Reste encore un jour'], [52, '(instrumental)']] },
    { id: 't6', title: 'Rue Oberkampf', artist: 'Trio Lumen', genre: 'Jazz', bpm: 96, root: 48, dur: 240, color: '#FF8A3D', shape: 'stripes' },
    { id: 't7', title: 'Hyperlune', artist: 'Lune Basse', genre: 'Électro', bpm: 128, root: 53, dur: 198, color: '#2EC5FF', shape: 'disc' },
    { id: 't8', title: 'Pluie douce', artist: 'Mira Loft', genre: 'Lo-fi', bpm: 72, root: 55, dur: 175, color: '#9B85FF', shape: 'ring' },
    { id: 't9', title: 'Quartier Nord', artist: 'K.Rimo feat. Sana', genre: 'Rap', bpm: 92, root: 47, dur: 177, color: '#FF5C8A', shape: 'diamond' },
    { id: 't10', title: 'Sous les néons', artist: 'Nadia Sol', genre: 'Chill', bpm: 100, root: 56, dur: 205, color: '#FFC24B', shape: 'dome' },
    { id: 't11', title: 'Ondes courtes', artist: 'Les Cerfs-Volants', genre: 'Indie', bpm: 118, root: 54, dur: 189, color: '#B8FF5C', shape: 'stripes' },
    { id: 't12', title: 'Minuit pile', artist: 'Velvet Ave', genre: 'Électro', bpm: 120, root: 50, dur: 222, color: '#7C5CFF', shape: 'pill' },
  ];

  const playlists = [
    { id: 'pl1', title: 'Nuits électriques', desc: 'Pour rouler la nuit, fenêtres ouvertes.', color: '#7C5CFF', shape: 'disc', tracks: ['t1', 't7', 't12', 't3'] },
    { id: 'pl2', title: 'Lo-fi pour bosser', desc: 'Concentration garantie.', color: '#FFC24B', shape: 'ring', tracks: ['t2', 't8', 't5', 't10'] },
    { id: 'pl3', title: 'Découvertes', desc: 'Tes nouveautés de la semaine.', color: '#2EC5FF', shape: 'dome', tracks: ['t4', 't11', 't9', 't6', 't10'] },
    { id: 'pl4', title: 'Indie FR', desc: 'Guitares et soleil.', color: '#B8FF5C', shape: 'pill', tracks: ['t4', 't11', 't5'] },
  ];
  const mixes = [
    { id: 'mx1', title: 'Mix Électro', sub: 'Basses lourdes, synthés', tag: 'ÉLECTRO', genre: 'Électro', color: '#7C5CFF', shape: 'disc', tracks: ['t1', 't7', 't12'] },
    { id: 'mx2', title: 'Mix Chill', sub: 'Pour décompresser', tag: 'CHILL', genre: 'Chill', color: '#2EC5FF', shape: 'ring', tracks: ['t5', 't10', 't8', 't2'] },
    { id: 'mx3', title: 'Mix Rap FR', sub: 'Les sorties du moment', tag: 'RAP FR', genre: 'Rap', color: '#FF5C8A', shape: 'diamond', tracks: ['t3', 't9'] },
    { id: 'mx4', title: 'Mix Lo-fi', sub: 'Pluie et café', tag: 'LO-FI', genre: 'Lo-fi', color: '#FFC24B', shape: 'ring', tracks: ['t2', 't8'] },
    { id: 'mx5', title: 'Mix Indie', sub: 'Guitares claires', tag: 'INDIE', genre: 'Indie', color: '#B8FF5C', shape: 'dome', tracks: ['t4', 't11'] },
    { id: 'mx6', title: 'Mix Jazz', sub: 'Caves et cuivres', tag: 'JAZZ', genre: 'Jazz', color: '#FF8A3D', shape: 'stripes', tracks: ['t6', 't2'] },
  ];

  return { tracks, friends: [], others: [], profiles: [], playlists, mixes, posts: [], convs: [], communities: [] };
})();
