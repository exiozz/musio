'use strict';
// ================= Musio — textes légaux (modèles à faire valider) =================
// Les mentions entre crochets sont à compléter. Ces textes sont des modèles de travail :
// ils doivent être relus et adaptés par un professionnel du droit avant toute mise en ligne.
const PH = s => `<span class="ph">[${s}]</span>`;
const NOTE = `<p class="note glass">Modèle de travail pour le prototype. Les éléments entre crochets sont à compléter, et le texte doit être validé par un juriste avant la mise en ligne de l’application.</p>`;
const LEGAL = {
  cgu: {
    title: 'Conditions d’utilisation', icon: 'doc', updated: '19 novembre 2026',
    body: `${NOTE}
<h3>1. Objet</h3><p>Les présentes conditions régissent l’utilisation de l’application Musio, éditée par ${PH('Nom de la société')}, qui permet d’écouter de la musique, de publier des vidéos et des photos en musique, de voir ce qu’écoutent ses amis, de rencontrer des personnes aux goûts proches et d’échanger par messages et en communautés.</p>
<h3>2. Accès au service</h3><p>Musio est réservé aux personnes âgées de 15 ans ou plus. Entre 15 et 18 ans, l’utilisateur déclare avoir informé ses représentants légaux. La fonction Match est réservée aux personnes majeures${PH('à confirmer selon le choix de l’éditeur')}.</p>
<h3>3. Compte</h3><p>Tu es responsable de ton compte et des informations que tu fournis. Un pseudonyme est autorisé ; l’usurpation de l’identité d’une autre personne est interdite.</p>
<h3>4. Contenus publiés</h3><ul><li>Tu restes propriétaire de tes contenus. Tu accordes à l’éditeur une licence non exclusive, mondiale et gratuite pour les héberger, les afficher et les diffuser dans l’application, pendant la durée de leur mise en ligne.</li><li>Tu garantis disposer des droits sur les photos, vidéos et textes que tu publies, notamment le droit à l’image des personnes qui y apparaissent.</li><li>Les musiques utilisées dans les publications proviennent du catalogue sous licence de Musio et ne peuvent être utilisées hors de l’application.</li></ul>
<h3>5. Règles de conduite</h3><p>Tu t’engages à respecter les Règles de la communauté. Les contenus illicites, haineux, violents, à caractère sexuel impliquant des mineurs, le harcèlement, le spam et la fraude sont interdits.</p>
<h3>6. Signalement et modération</h3><p>Chaque contenu, profil ou message peut être signalé. L’éditeur examine les signalements, peut retirer un contenu, restreindre ou suspendre un compte, et informe la personne concernée de la décision et des moyens de la contester, conformément au règlement européen sur les services numériques.</p>
<h3>7. Responsabilité</h3><p>L’éditeur met en œuvre les moyens raisonnables pour assurer le bon fonctionnement du service, sans garantie d’absence d’interruption. Il n’est pas responsable des contenus publiés par les utilisateurs, sauf s’il en a eu connaissance et ne les a pas retirés promptement.</p>
<h3>8. Résiliation</h3><p>Tu peux supprimer ton compte à tout moment depuis Réglages › Mes données. L’éditeur peut suspendre un compte en cas de manquement grave aux présentes conditions.</p>
<h3>9. Modifications</h3><p>Les conditions peuvent évoluer. Tu seras informé·e de toute modification importante avant son entrée en vigueur.</p>
<h3>10. Droit applicable</h3><p>Les présentes conditions sont soumises au droit français. En cas de litige, une solution amiable sera recherchée avant toute action ; tu peux aussi recourir gratuitement à un médiateur de la consommation : ${PH('nom et coordonnées du médiateur')}.</p>
<h3>Contact</h3><p>${PH('Adresse e-mail de contact')} · ${PH('Adresse postale')}</p>`,
  },
  privacy: {
    title: 'Politique de confidentialité', icon: 'shield', updated: '19 novembre 2026',
    body: `${NOTE}
<h3>Qui est responsable de tes données ?</h3><p>${PH('Nom de la société')}, ${PH('adresse')}, est responsable du traitement. Délégué à la protection des données : ${PH('e-mail du DPO')}.</p>
<h3>Quelles données ?</h3><ul><li><b>Compte</b> : nom affiché, nom d’utilisateur, photo de profil, bio, genres préférés.</li><li><b>Activité</b> : écoutes, likes, abonnements, publications, commentaires, matchs.</li><li><b>Messages</b> : contenu des conversations privées et des communautés.</li><li><b>Position approximative</b> : uniquement si tu actives le partage sur la Map, au niveau du quartier.</li><li><b>Données techniques</b> : type d’appareil, journaux de connexion, à des fins de sécurité.</li></ul>
<h3>Pourquoi ?</h3><ul><li>Fournir le service (exécution du contrat).</li><li>Personnaliser le fil Pour toi et les suggestions Match (consentement, modifiable à tout moment).</li><li>Mesurer l’audience de façon agrégée (consentement).</li><li>Assurer la sécurité et la modération, et répondre aux obligations légales (obligation légale et intérêt légitime).</li></ul>
<h3>Combien de temps ?</h3><p>Tant que ton compte est actif, puis ${PH('durée')} après sa suppression pour les données nécessaires à la gestion des litiges. Les journaux techniques sont conservés ${PH('durée, 12 mois maximum recommandé')}.</p>
<h3>Qui y a accès ?</h3><p>Les équipes habilitées de l’éditeur et ses sous-traitants (hébergement : ${PH('hébergeur')}). Les données ne sont jamais vendues. En cas de transfert hors de l’Union européenne, des garanties appropriées sont mises en place.</p>
<h3>Tes droits</h3><p>Tu disposes d’un droit d’accès, de rectification, d’effacement, de limitation, d’opposition et de portabilité, ainsi que du droit de définir des directives sur le sort de tes données après ton décès. Une partie de ces droits s’exerce directement dans Réglages › Mes données ; pour le reste, écris à ${PH('e-mail de contact')}. Tu peux introduire une réclamation auprès de la CNIL (cnil.fr).</p>
<h3>Mineurs</h3><p>Le service est ouvert dès 15 ans. Les comptes de moins de 18 ans n’ont pas accès à Match et ne sont pas visibles sur la Map par des inconnus${PH('à confirmer')}.</p>`,
  },
  community: {
    title: 'Règles de la communauté', icon: 'users', updated: '19 novembre 2026',
    body: `<p>Musio, c’est de la musique et des gens. Pour que tout le monde s’y sente bien :</p>
<h3>Respecte les autres</h3><ul><li>Pas de harcèlement, d’insultes, de menaces ni d’humiliation.</li><li>Pas de discours haineux visant une origine, une religion, un genre, une orientation sexuelle, un handicap ou tout autre critère protégé.</li><li>Pas de partage d’informations privées sur autrui (adresse, téléphone, photos sans accord).</li></ul>
<h3>Sois authentique</h3><ul><li>N’usurpe pas l’identité d’une personne ou d’un artiste.</li><li>Pas de faux comptes, de spam, d’achat de likes ou d’abonnés.</li></ul>
<h3>Protège les plus jeunes</h3><p>Tout contenu sexualisant des mineurs est strictement interdit et signalé aux autorités. Si un mineur est en danger, appelle le 119.</p>
<h3>Pas de contenus dangereux</h3><p>Pas de promotion de la violence, de l’automutilation, du terrorisme, ni de vente de produits illégaux.</p>
<h3>Respecte les créateurs</h3><p>Ne publie que des contenus dont tu as les droits. Crédite les artistes.</p>
<h3>Rencontres (Match)</h3><p>Sois honnête sur ton profil. Le consentement est essentiel : un refus ou une absence de réponse se respecte. Pour un premier rendez-vous, privilégie un lieu public.</p>
<h3>Que se passe-t-il en cas de manquement ?</h3><p>Le contenu peut être retiré, le compte restreint ou suspendu. Tu es informé·e de la décision et tu peux la contester.</p>`,
  },
  cookies: {
    title: 'Cookies et traceurs', icon: 'cookie', updated: '19 novembre 2026',
    body: `${NOTE}
<p>Musio utilise des traceurs (stockage local de l’appareil) pour fonctionner et, avec ton accord, pour améliorer le service.</p>
<h3>Strictement nécessaires (toujours actifs)</h3><p>Garder ta session, tes réglages, ta file d’attente et ton fil. Ils ne nécessitent pas de consentement.</p>
<h3>Personnalisation (au choix)</h3><p>Adapter le fil Pour toi et les suggestions Match à tes goûts.</p>
<h3>Mesure d’audience (au choix)</h3><p>Statistiques agrégées sur l’utilisation de l’application. Outil : ${PH('outil de mesure')}.</p>
<h3>Publicité personnalisée (au choix)</h3><p>Désactivée par défaut. Partenaires : ${PH('liste des partenaires')}.</p>
<p>Tu peux modifier tes choix à tout moment dans Réglages › Consentements. Refuser est aussi simple qu’accepter, et ton choix est conservé ${PH('6 mois recommandés')}.</p>`,
  },
  copyright: {
    title: 'Droits d’auteur et musique', icon: 'music', updated: '19 novembre 2026',
    body: `${NOTE}
<h3>Le catalogue</h3><p>Les titres disponibles dans Musio sont diffusés sous licence ${PH('accords avec les ayants droit / organismes de gestion collective')}. Ils ne peuvent être utilisés qu’à l’intérieur de l’application.</p>
<h3>Tes publications</h3><p>Tu peux associer un extrait du catalogue à tes photos et vidéos. N’importe pas de musique dont tu n’as pas les droits.</p>
<h3>Signaler une atteinte à vos droits</h3><p>Si vous êtes titulaire de droits et estimez qu’un contenu y porte atteinte, utilisez Signaler › Droits d’auteur sur le contenu, ou écrivez à ${PH('e-mail dédié')} en précisant : votre identité, l’œuvre concernée, le lien vers le contenu, et une déclaration de bonne foi. Le contenu est examiné promptement et peut être retiré.</p>
<h3>Contre-notification</h3><p>L’auteur d’un contenu retiré est informé et peut contester la décision en expliquant pourquoi il dispose des droits.</p>`,
  },
  mentions: {
    title: 'Mentions légales', icon: 'scale', updated: '19 novembre 2026',
    body: `${NOTE}
<h3>Éditeur</h3><p>${PH('Nom de la société')}, ${PH('forme juridique')} au capital de ${PH('montant')} €<br>Siège : ${PH('adresse')}<br>RCS ${PH('ville et numéro')} · TVA ${PH('numéro')}<br>Contact : ${PH('e-mail')} · ${PH('téléphone')}</p>
<h3>Directeur de la publication</h3><p>${PH('Nom et prénom')}</p>
<h3>Hébergeur</h3><p>${PH('Nom de l’hébergeur')}, ${PH('adresse')}, ${PH('téléphone')}</p>
<h3>Propriété intellectuelle</h3><p>La marque Musio, le logo et l’interface sont protégés. Toute reproduction sans autorisation est interdite.</p>
<h3>Point de contact (règlement sur les services numériques)</h3><p>Autorités et utilisateurs : ${PH('e-mail du point de contact')}. Langues acceptées : français, anglais.</p>`,
  },
  safety: {
    title: 'Sécurité et aide', icon: 'help', updated: '19 novembre 2026',
    body: `<h3>Tu te sens en danger ?</h3><ul><li>Urgence : <b>112</b> (ou 17 police, 15 SAMU)</li><li>Harcèlement en ligne, cyberharcèlement : <b>3018</b> (gratuit, anonyme, 7j/7)</li><li>Enfant ou adolescent en danger : <b>119</b></li><li>Violences faites aux femmes : <b>3919</b></li></ul>
<h3>Bloquer quelqu’un</h3><p>Sur un profil ou dans une conversation, touche les trois points puis Bloquer. La personne ne peut plus te voir sur la Map, t’écrire, ni voir tes publications. Elle n’est pas prévenue. Tu peux débloquer depuis Réglages › Comptes bloqués.</p>
<h3>Signaler</h3><p>Partager › Signaler sur une publication, ou les trois points sur un profil ou une conversation. Le signalement est anonyme pour la personne signalée.</p>
<h3>Mode fantôme</h3><p>Sur la Map, l’œil en haut à droite masque ce que tu écoutes à tes amis.</p>
<h3>Rencontres</h3><p>Ne partage pas d’informations sensibles trop vite, n’envoie jamais d’argent à une personne rencontrée en ligne, et privilégie un lieu public pour un premier rendez-vous.</p>`,
  },
};
const REPORT_REASONS = [['spam', 'Spam ou arnaque'], ['harass', 'Harcèlement ou intimidation'], ['hate', 'Discours haineux'], ['violence', 'Violence ou contenu dangereux'], ['nudity', 'Nudité ou contenu sexuel'], ['minor', 'Mise en danger d’un mineur'], ['copyright', 'Droits d’auteur'], ['fake', 'Usurpation d’identité ou faux compte'], ['other', 'Autre chose']];
