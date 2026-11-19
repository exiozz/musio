// Données de démo — tout est fictif.
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

  const friends = [
    { id: 'f1', name: 'Léa', handle: 'lea.wav', color: '#FF5C8A', trackId: 't4', x: 520, y: 600, live: true, place: 'Canal Saint-Martin', ago: '', persona: 'Léa, 24 ans, étudiante en graphisme, fan d’indie et de couchers de soleil, enthousiaste et un peu bavarde' },
    { id: 'f2', name: 'Yanis', handle: 'yanis.bpm', color: '#2EC5FF', trackId: 't3', x: 770, y: 420, live: true, place: 'Belleville', ago: '', persona: 'Yanis, 25 ans, beatmaker rap, chambreur, écrit vite avec des abréviations (jsp, tkt, grv)' },
    { id: 'f3', name: 'Inès', handle: 'ines_lofi', color: '#FFC24B', trackId: 't2', x: 380, y: 880, live: true, place: 'République', ago: '', persona: 'Inès, 23 ans, révise toujours avec du lo-fi, douce et un peu stressée par ses partiels' },
    { id: 'f4', name: 'Hugo', handle: 'hugo.fm', color: '#B8FF5C', trackId: 't7', x: 910, y: 800, live: true, place: 'Oberkampf', ago: '', persona: 'Hugo, 27 ans, DJ amateur électro, toujours partant pour sortir, très énergique' },
    { id: 'f5', name: 'Camille', handle: 'cam.sun', color: '#9B85FF', trackId: 't5', x: 290, y: 430, live: true, place: 'Buttes-Chaumont', ago: '', persona: 'Camille, 26 ans, aime la musique chill et soul, calme, un peu poétique' },
    { id: 'f6', name: 'Sami', handle: 'sami808', color: '#FF8A3D', trackId: 't9', x: 640, y: 1070, live: true, place: 'Bastille', ago: '', persona: 'Sami, 24 ans, fan de rap français et de foot, très drôle, adore taquiner' },
    { id: 'f7', name: 'Jade', handle: 'jade.vinyl', color: '#7C5CFF', trackId: 't6', x: 1010, y: 560, live: false, place: 'Ménilmontant', ago: '2 h', persona: 'Jade, 29 ans, collectionneuse de vinyles de jazz, cultivée, phrases soignées' },
    { id: 'f8', name: 'Noé', handle: 'noe.indie', color: '#2EC5FF', trackId: 't11', x: 210, y: 1150, live: false, place: 'Marais', ago: '5 h', persona: 'Noé, 22 ans, guitariste indie, rêveur, un peu timide' },
  ];

  const others = [
    { id: 'u1', name: 'Velvet Ave', handle: 'velvetave', color: '#7C5CFF', verified: true, artist: 'Velvet Ave', bio: 'Duo électro. Nouveau single « Minuit pile » disponible.' },
    { id: 'u2', name: 'Mira Loft', handle: 'miraloft', color: '#FFC24B', verified: true, artist: 'Mira Loft', bio: 'Beats lo-fi faits à la maison, sur cassette.' },
    { id: 'u3', name: 'Studio Bleu', handle: 'studiobleu', color: '#2EC5FF', verified: false, bio: 'Sessions acoustiques en appartement.' },
    { id: 'u4', name: 'Lune Basse', handle: 'lunebasse', color: '#FF5C8A', verified: true, artist: 'Lune Basse', bio: 'Musique pour la nuit.' },
    { id: 'u5', name: 'K.Rimo', handle: 'krimo', color: '#7C5CFF', verified: true, artist: 'K.Rimo', bio: 'Rap du 19e.' },
  ];

  const profiles = [
    { id: 'm1', name: 'Alice', age: 24, dist: 1.2, compat: 92, genres: ['Électro', 'Chill'], top: ['Lune Basse', 'Nadia Sol', 'Velvet Ave'], anthem: 't1', likesYou: true, color: '#FF5C8A', shape: 'disc', bio: 'Je fais une playlist pour chaque humeur. Concerts avant tout.', persona: 'Alice, 24 ans, fan d’électro et de chill, drôle et directe' },
    { id: 'm2', name: 'Théo', age: 26, dist: 3, compat: 85, genres: ['Rap', 'Lo-fi'], top: ['K.Rimo', 'Mira Loft'], anthem: 't3', likesYou: false, color: '#7C5CFF', shape: 'diamond', bio: 'J’écris des textes la nuit, je les jette le matin.', persona: 'Théo, 26 ans, écrit du rap, réservé mais curieux' },
    { id: 'm3', name: 'Maya', age: 23, dist: 0.8, compat: 78, genres: ['Indie', 'Jazz'], top: ['Les Cerfs-Volants', 'Trio Lumen'], anthem: 't11', likesYou: true, color: '#2EC5FF', shape: 'dome', bio: 'Guitare, vélo, et trop de vinyles pour mon appart.', persona: 'Maya, 23 ans, indie et jazz, joyeuse et spontanée' },
    { id: 'm4', name: 'Rayan', age: 25, dist: 5, compat: 71, genres: ['Rap'], top: ['K.Rimo', 'Sana'], anthem: 't9', likesYou: false, private: true, color: '#FF8A3D', shape: 'stripes', bio: 'Freestyle le jeudi, foot le dimanche.', persona: 'Rayan, 25 ans, rappeur amateur, blagueur' },
    { id: 'm5', name: 'Zoé', age: 22, dist: 2, compat: 88, genres: ['Lo-fi', 'Chill'], top: ['Mira Loft', 'Nadia Sol'], anthem: 't8', likesYou: true, color: '#FFC24B', shape: 'ring', bio: 'Cherche quelqu’un pour partager des écouteurs dans le métro.', persona: 'Zoé, 22 ans, lo-fi et chill, douce et taquine' },
    { id: 'm6', name: 'Lucas', age: 27, dist: 4, compat: 64, genres: ['Jazz'], top: ['Trio Lumen'], anthem: 't6', likesYou: false, color: '#B8FF5C', shape: 'pill', bio: 'Batteur. Je connais tous les clubs de jazz de Paris.', persona: 'Lucas, 27 ans, batteur de jazz, passionné' },
    { id: 'm7', name: 'Nina', age: 24, dist: 1.5, compat: 90, genres: ['Électro'], top: ['Velvet Ave', 'Lune Basse'], anthem: 't12', likesYou: false, hideLists: true, color: '#9B85FF', shape: 'disc', bio: 'Plus de nuits blanches que de jours gris.', persona: 'Nina, 24 ans, fêtarde électro, mystérieuse' },
    { id: 'm8', name: 'Elias', age: 28, dist: 6, compat: 69, genres: ['Indie'], top: ['Les Cerfs-Volants'], anthem: 't4', likesYou: true, color: '#2EC5FF', shape: 'ring', bio: 'Road trips, cassettes et cafés trop forts.', persona: 'Elias, 28 ans, indie, aventurier et chaleureux' },
    { id: 'm9', name: 'Léonie', age: 25, dist: 12, compat: 83, genres: ['Chill', 'Indie'], top: ['Nadia Sol', 'Les Cerfs-Volants'], anthem: 't10', likesYou: true, color: '#FF8A3D', shape: 'pill', bio: 'Photographe le jour, playlists la nuit.', persona: 'Léonie, 25 ans, photographe, fan de chill et d’indie, curieuse' },
    { id: 'm10', name: 'Karim', age: 27, dist: 34, compat: 76, genres: ['Rap', 'Électro'], top: ['K.Rimo', 'Lune Basse'], anthem: 't9', likesYou: false, color: '#7C5CFF', shape: 'diamond', bio: 'Je cherche des gens pour aller en festival cet été.', persona: 'Karim, 27 ans, fan de rap et d’électro, sociable et drôle' },
    { id: 'm11', name: 'Jeanne', age: 24, dist: 75, compat: 91, genres: ['Lo-fi', 'Jazz'], top: ['Mira Loft', 'Trio Lumen'], anthem: 't2', likesYou: true, color: '#B8FF5C', shape: 'ring', bio: 'Étudiante en conservatoire. Piano, café, pluie.', persona: 'Jeanne, 24 ans, étudiante au conservatoire, lo-fi et jazz, douce et passionnée' },
    { id: 'm12', name: 'Adam', age: 29, dist: 160, compat: 72, genres: ['Indie'], top: ['Les Cerfs-Volants'], anthem: 't11', likesYou: false, color: '#2EC5FF', shape: 'stripes', bio: 'Je fais 150 km pour un bon concert, sans hésiter.', persona: 'Adam, 29 ans, indie, grand voyageur pour les concerts' },
    { id: 'm13', name: 'Inaya', age: 23, dist: 280, compat: 87, genres: ['Électro', 'Chill'], top: ['Velvet Ave', 'Nadia Sol'], anthem: 't12', likesYou: true, color: '#FF5C8A', shape: 'disc', bio: 'DJ débutante. Je monte souvent à Paris pour jouer.', persona: 'Inaya, 23 ans, DJ débutante électro, enthousiaste' },
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

  const c = (user, text, likes, ago) => ({ user, text, likes, ago });
  const posts = [
    { id: 'p1', author: 'f1', trackId: 't4', start: 44, style: 'waves', caption: 'Le refrain à 0:45 me tue à chaque fois #indie #sunset', likes: 12400, commentsBase: 214, shares: 320,
      comments: [c('f8', 'Ce refrain c’est trop', 34, '2 h'), c('m3', 'Je l’écoute en boucle depuis hier', 12, '5 h'), c('f5', 'La lumière de ta vidéo est folle', 8, '6 h')] },
    { id: 'p2', author: 'f2', trackId: 't3', start: 20, style: 'grid', caption: 'Qui veut un freestyle sur ce beat ? #rapfr #beat', likes: 48100, commentsBase: 1032, shares: 2100,
      comments: [c('f6', 'Moi moi moi', 120, '1 h'), c('m4', 'Envoie la prod en dm', 45, '3 h')] },
    { id: 'p3', author: 'u2', trackId: 't8', start: 10, style: 'orbs', caption: '« Pluie douce » sort vendredi. Version cassette dispo #lofi #chill', likes: 103000, commentsBase: 3200, shares: 8100,
      comments: [c('f3', 'Mon album de révisions est prêt', 220, '4 h'), c('m5', 'La cassette !!', 98, '7 h')] },
    { id: 'p4', author: 'f5', trackId: 't5', start: 30, style: 'particles', caption: '« Velours » en boucle depuis 3 jours #chill #soul', likes: 5600, commentsBase: 88, shares: 140,
      comments: [c('f1', 'Trop beau', 6, '30 min')] },
    { id: 'p5', author: 'u1', trackId: 't12', start: 60, style: 'bars', caption: 'Minuit pile — en live samedi au Badaboum #electro', likes: 76300, commentsBase: 1900, shares: 4300,
      comments: [c('f4', 'J’y serai', 54, '2 h'), c('m7', 'Enfin une date à Paris', 31, '3 h')] },
    { id: 'p6', author: 'f4', trackId: 't7', start: 48, style: 'waves', caption: 'Ma prod préférée de Lune Basse, le drop à 1:00 #electro #club', likes: 9800, commentsBase: 150, shares: 210,
      comments: [c('f2', 'Le drop est violent', 18, '1 h')] },
    { id: 'p7', author: 'f7', trackId: 't6', start: 15, style: 'orbs', caption: 'Dimanche, vinyle, café #jazz #vinyle', likes: 3400, commentsBase: 42, shares: 60,
      comments: [c('m6', 'Trio Lumen en live c’est autre chose', 9, '1 j')] },
    { id: 'p8', author: 'u3', trackId: 't11', start: 25, style: 'particles', caption: 'Session acoustique chez nous, épisode 12 #indie #live', likes: 21200, commentsBase: 410, shares: 900,
      comments: [c('f8', 'Les harmonies !', 22, '3 h')] },
  ];

  const m = (from, text, ago, extra) => Object.assign({ from, text, ago }, extra || {});
  const convs = [
    { id: 'c-f1', with: 'f1', unread: 1, msgs: [m('f1', 't’as écouté le nouveau des Cerfs-Volants ?', 95), m('me', 'pas encore !', 90), m('f1', '', 12, { track: 't4' }), m('f1', 'écoute ça, le refrain est fou', 12)] },
    { id: 'c-f2', with: 'f2', unread: 2, msgs: [m('f2', 'yo', 40), m('f2', 'ce soir concert de K.Rimo, tu viens ?', 39)] },
    { id: 'c-f3', with: 'f3', unread: 0, msgs: [m('me', 'je t’ai fait une playlist pour réviser', 300), m('f3', 'merci, t’es un amour', 280), m('f3', 'je la lance direct', 279)] },
    { id: 'c-f4', with: 'f4', unread: 0, msgs: [m('f4', 'samedi Badaboum ?', 1500), m('me', 'grave', 1490)] },
  ];

  const p = (user, text, ago, likes, extra) => Object.assign({ user, text, ago, likes }, extra || {});
  const communities = [
    { id: 'k1', name: 'Électro Paris', members: 12400, color: '#7C5CFF', shape: 'disc', joined: true, desc: 'Soirées, sorties et sons électro à Paris.', crew: ['Hugo', 'Nina', 'Malik', 'Sofia'],
      posts: [p('Malik', 'Quelqu’un a des places en trop pour Velvet Ave samedi ?', 180, 12), p('Sofia', 'Ma découverte de la semaine', 95, 30, { track: 't7' }), p('Hugo', 'On se retrouve devant à 23 h ceux qui viennent', 20, 8)] },
    { id: 'k2', name: 'Lo-fi & études', members: 8100, color: '#FFC24B', shape: 'ring', joined: true, desc: 'Session de travail en musique, tous les soirs à 20 h.', crew: ['Inès', 'Zoé', 'Paul', 'Lina'],
      posts: [p('Paul', 'Session ce soir, 3 h de concentration. Qui est chaud ?', 240, 18), p('Inès', 'Pour démarrer', 60, 25, { track: 't2' })] },
    { id: 'k3', name: 'Rap FR Underground', members: 21000, color: '#FF5C8A', shape: 'diamond', joined: false, desc: 'Les pépites avant tout le monde.', crew: ['Yanis', 'Sami', 'Rayan', 'Bilal'],
      posts: [p('Bilal', 'K.Rimo va exploser cette année, notez-le', 300, 64), p('Yanis', 'Nouvelle prod, avis ?', 45, 40, { track: 't3' })] },
    { id: 'k4', name: 'Vinyles & jazz', members: 3200, color: '#FF8A3D', shape: 'stripes', joined: false, desc: 'Échanges, bons plans disquaires et écoutes du dimanche.', crew: ['Jade', 'Lucas', 'Marc', 'Odile'],
      posts: [p('Jade', 'Trouvé un pressage original de 1972 aux puces', 500, 22), p('Marc', 'Ça tourne ce matin', 120, 9, { track: 't6' })] },
    { id: 'k5', name: 'Indie du dimanche', members: 5600, color: '#2EC5FF', shape: 'dome', joined: false, desc: 'Guitares, folk et dimanches lents.', crew: ['Noé', 'Maya', 'Elias', 'Clara'],
      posts: [p('Clara', 'Les Cerfs-Volants en concert gratuit au parc !', 220, 35), p('Noé', 'Ma reprise à la guitare de celle-ci', 80, 14, { track: 't11' })] },
  ];

  return { tracks, friends, others, profiles, playlists, mixes, posts, convs, communities };
})();
