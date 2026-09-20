# Football App — Spécification frontend (pour design)

Application type "Letterboxd du sport" : les utilisateurs notent et commentent des matchs de foot, suivent d'autres utilisateurs, likent/commentent leurs reviews. Web d'abord, pensé pour être décliné sur mobile plus tard.

Ton recherché : pas encore défini précisément (voir avec l'auteur du prompt), mais l'esprit "Letterboxd" implique quelque chose d'assez épuré, orienté contenu, avec une identité un peu "cinéphile/passionné" transposée au sport plutôt qu'un site de stats sportives classique.

État actuel : l'app fonctionne avec une interface minimale (HTML non stylé, quelques couleurs ad hoc), aucun design system. Tout est à designer.

---

## Navigation globale

Barre de navigation présente sur toutes les pages, avec :
- 4 liens : **Accueil**, **Recherche**, **Notifications**, **Profil**
- Lien actif visuellement distingué des autres
- À droite : si connecté, nom d'affichage de l'utilisateur + bouton **Déconnexion** ; si non connecté, liens **Connexion** / **Inscription**

---

## Écran Connexion (`/login`)

- Formulaire : email, mot de passe, bouton "Se connecter"
- Message d'erreur si identifiants invalides
- Deux boutons de connexion externe : "Continuer avec Google", "Continuer avec Apple"
- Lien vers l'inscription en bas

## Écran Inscription (`/register`)

- Formulaire : nom affiché, email, mot de passe (8 caractères min.), bouton "Créer mon compte"
- Message d'erreur (ex: email déjà utilisé, mot de passe trop court)
- Lien vers la connexion en bas

---

## Écran Accueil (`/`)

Écran principal, en **deux colonnes** (desktop) — colonne de gauche plus large que la colonne de droite.

### Colonne de gauche : "Mes ligues"

- Titre "Mes ligues" + lien "Toutes les ligues" (mène à l'écran de gestion des favoris)
- **Sélecteur de date** horizontal : les 5 prochains jours (aujourd'hui + 4), sous forme de boutons/pills, le jour sélectionné visuellement distingué. Format affiché : jour de semaine abrégé + jour + mois (ex: "mer. 17 sept."), dans la locale du navigateur de l'utilisateur.
- **Liste de ligues** ayant au moins un match à la date sélectionnée :
  - Les ligues favorites de l'utilisateur apparaissent **en premier** (marquées d'une étoile ★), puis le reste des ligues par ordre alphabétique
  - Chaque ligne = nom de la ligue + un **badge rouge circulaire** avec le nombre de matchs actuellement en direct dans cette ligue (affiché seulement si > 0)
  - Toute la ligne est cliquable → mène à l'écran de détail de cette ligue, à la date sélectionnée
  - Si aucun match ce jour-là : message "Aucun match ce jour-là"
- Utilisateur non connecté : toutes les ligues avec un match ce jour-là sont affichées (pas de tri favoris, pas d'étoile), sans distinction

### Colonne de droite : 3 sections empilées

**1. Reviews populaires**
- Liste de reviews jugées "populaires" (calcul : likes + commentaires×2, sur les reviews des dernières 48h, classées par score décroissant)
- Chaque carte affiche : les deux équipes du match concerné (petit texte au-dessus), nom de l'auteur + note sur 5, extrait du commentaire (tronqué à ~100 caractères s'il est long), puis nombre de likes et de commentaires
- Cliquable → mène à l'écran de détail du match concerné
- État vide : "Rien de populaire pour l'instant"

**2. Reviews de mes amis**
- Reviews récentes des utilisateurs que l'utilisateur connecté suit, triées par date décroissante (pas de limite de fraîcheur, juste "les plus récentes")
- Même format de carte que "Reviews populaires"
- Si non connecté : message invitant à se connecter
- Si connecté mais ne suit personne (ou personne n'a encore review) : message invitant à suivre des utilisateurs, avec un lien (actuellement vers l'écran Recherche, qui est un stub — pas encore de véritable annuaire d'utilisateurs)

**3. Matchs populaires**
- Matchs les plus reviewés sur les dernières 48h (classés par nombre de reviews décroissant)
- Chaque carte : les deux équipes + le score, et le nombre de reviews à droite
- Cliquable → détail du match
- État vide : "Rien de populaire pour l'instant"

---

## Écran "Toutes les ligues" (`/leagues`)

- Titre "Toutes les ligues"
- Liste de **toutes** les ligues suivies par l'application (~85 ligues, tous pays/compétitions confondus — pas seulement les grands championnats)
- Chaque ligne : nom de la ligue + bouton "☆ Ajouter" / "★ Favori" (bascule l'état favori au clic)
- Si non connecté : pas de bouton favori, juste un message invitant à se connecter pour en ajouter

## Écran Détail d'une ligue (`/leagues/[id]`)

- Lien retour vers l'Accueil
- Nom de la ligue en titre
- Même sélecteur de date horizontal que l'Accueil (+5 jours)
- Liste des matchs de **cette ligue uniquement** à la date sélectionnée :
  - Chaque ligne : équipe domicile — équipe extérieure, et à droite soit l'heure du match (si à venir), soit le score (si en cours/terminé, avec mention "(live)" si en cours), soit un statut textuel ("Reporté", "Annulé", "Abandonné")
  - Cliquable → détail du match
- État vide : "Aucun match ce jour-là"

---

## Écran Détail d'un match (`/matches/[id]`)

- Nom de la ligue (petit texte au-dessus)
- Titre : équipe domicile + score + équipe extérieure
- Sous-titre : date/heure du coup d'envoi (locale utilisateur), stade, statut du match
- Si un lien de highlight vidéo est disponible : lien "Voir les highlights" (vers YouTube, nouvel onglet)
- **Compositions** (si disponibles — pas toujours le cas selon la ligue/le match) : deux colonnes, joueurs domicile à gauche, extérieur à droite, liste de noms simple. À noter pour le design : dans les faits, l'API ne fournit quasiment jamais ni la formation tactique ni les remplaçants, seulement les 11 titulaires
- **Formulaire "Logger le match"** (visible seulement si connecté et si l'utilisateur n'a pas déjà noté ce match) :
  - Sélecteur de note : de 0.5 à 5, par pas de 0.5 (dix valeurs)
  - Zone de texte pour un commentaire optionnel
  - Bouton "Valider"
  - Si déjà loggé : message "Vous avez déjà loggé ce match" à la place du formulaire
  - Si non connecté : message invitant à se connecter
- **Liste des reviews** du match, chacune affichant :
  - Auteur + note sur 5
  - Commentaire (si renseigné)
  - Bouton "J'aime" (avec compteur) — état "aimé" visuellement distinct
  - Bouton "Commentaires" (avec compteur) qui déplie/replie une section commentaires
  - Section commentaires dépliée : liste des commentaires (auteur + contenu) + un champ pour en ajouter un (si connecté)
  - Si l'utilisateur connecté est l'auteur de la review : bouton "Supprimer"

---

## Écran Notifications (`/notifications`)

- Titre "Notifications"
- Liste de notifications, chacune de la forme : "**[Nom de l'utilisateur]** a [aimé / commenté] votre review" ou "**[Nom]** a commencé à vous suivre"
- Notifications non lues affichées en gras, cliquables pour les marquer comme lues (repassent en poids normal)
- Si non connecté : message invitant à se connecter
- État vide : "Aucune notification"

---

## Écran Profil (`/profile`)

- Avatar (image ronde) + nom d'affichage en titre
- Ligne de statistiques : nombre de followers, nombre de suivi(e)s, nombre total de matchs notés (toutes saisons), nombre de matchs vus **cette saison**
- **Matchs préférés (saison en cours)** : les 4 matchs les mieux notés par l'utilisateur cette saison (triés par note décroissante), chacun affichant équipes + score + lien vers le match + la note donnée
- **Derniers matchs loggés (saison en cours)** : les 4 dernières reviews de la saison en cours, triées par date décroissante, même format d'affichage
- États vides pour chacune de ces deux listes si l'utilisateur n'a rien noté cette saison
- Pas encore de vue "profil d'un autre utilisateur" — actuellement uniquement son propre profil

---

## Écran Recherche (`/search`)

- **Stub uniquement** : titre "Recherche" + texte "Bientôt disponible"
- Développement complet reporté après le MVP — mais gardé en tête que ça devra à terme permettre de chercher un match précis ET/OU des utilisateurs à suivre (actuellement référencé comme lien de fallback pour "trouver des gens à suivre" depuis l'accueil)

---

## Statuts de match à représenter visuellement

Un match peut avoir l'un de ces 7 statuts, chacun nécessitant potentiellement un traitement visuel distinct (couleur, badge, etc.) :
- `scheduled` — à venir (affiche l'heure du coup d'envoi)
- `live` — en cours (affiche le score + "(live)")
- `finished` — terminé (affiche le score final)
- `postponed` — reporté
- `cancelled` — annulé
- `suspended` — suspendu (interruption en cours de match)
- `abandoned` — abandonné

## Éléments visuels déjà en place (à garder, adapter ou remplacer)

- Badge rond rouge avec chiffre blanc pour compter les matchs en direct par ligue
- Étoile (★) pour marquer une ligue favorite
- Avatars ronds (générés par défaut via Dicebear si l'utilisateur n'en a pas uploadé)
- Logos d'équipes et de ligues disponibles via l'API (badges/logos officiels TheSportsDB), pas encore affichés dans l'UI actuelle mais disponibles pour le design

## Notes générales pour le design

- Aucune donnée fictive à inventer pour les maquettes si possible : privilégier des placeholders réalistes (vrais noms d'équipes/ligues européennes, notes entre 0.5 et 5 par pas de 0.5, dates/heures plausibles)
- Prévoir des états de chargement ("Chargement...") et des états vides pour quasiment chaque liste de contenu (aucune n'est garantie non-vide)
- Le badge live et le compteur de reviews/likes sont des données qui changent fréquemment (surtout en live) — le design doit rester lisible même avec des nombres à 2-3 chiffres
- Version desktop prioritaire, mais penser mobile pour une V2 (pas de contrainte stricte de responsive pour l'instant, mais éviter les designs qui casseraient totalement sur petit écran)
