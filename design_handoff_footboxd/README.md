# Handoff — FootBoxd, interface complète

## Vue d'ensemble

Refonte visuelle intégrale de l'app (« Letterboxd du sport » : on note et commente des matchs de foot, on suit des gens, on aime et on commente leurs reviews). Le CSS actuel du projet est quasi nul — ce bundle définit la direction artistique, le design system et les 9 écrans, y compris leurs états de chargement, vides et connecté / non connecté.

## À propos des fichiers de ce bundle

Les fichiers `.dc.html` sont des **références de design écrites en HTML** : des prototypes qui montrent l'aspect et le comportement attendus, **pas du code de production à copier**. Le travail consiste à **recréer ces designs dans l'environnement existant du projet** (Next.js / React, CSS modules + styles inline) en suivant ses conventions.

Deux conséquences pratiques :

- Ils s'appuient sur un runtime de prototypage (`support.js`, balises `sc-for` / `sc-if` / `{{ … }}`). N'importez rien de tout ça : lisez le markup et les valeurs, réécrivez en JSX.
- Les styles y sont **inline** par contrainte de l'outil de prototypage, pas par choix d'architecture. Dans le projet, les valeurs doivent venir de `tokens.css` (variables CSS) et des CSS modules existants (`nav.module.css`, etc.).

Pour lire les valeurs sans deviner à l'œil : ouvrez le `.dc.html` en texte, les hex, tailles et espacements y sont écrits littéralement. `tokens.css` en est l'extraction canonique — **en cas de divergence entre un fichier d'écran et `tokens.css`, `tokens.css` fait foi.**

## Fidélité

**Haute fidélité (hifi).** Couleurs, typographie, espacements, rayons et états sont définitifs et validés. À reproduire fidèlement. Deux réserves explicites :

- **Aucun logo réel** n'est intégré : écussons d'équipes et de ligues (TheSportsDB), avatars (Dicebear), logos Google et Apple. Tous leurs emplacements sont réservés, aux bonnes dimensions, avec un fond de hachures (`--fb-hatch-avatar`). À remplacer par les vraies images.
- **Desktop uniquement.** Le responsive est décrit plus bas en règles, mais aucune maquette mobile n'a été produite.

---

## Direction artistique en trois règles

1. **Encre, pas stade.** Fond bleu-nuit très sombre, aucune texture de pelouse, aucun dégradé, aucune ombre portée. Les seules couleurs saturées à l'écran sont les écussons officiels et les 5 couleurs fonctionnelles. **Le vert « pelouse » est banni** (le citron `--fb-action` est un vert d'action, pas un vert de terrain).
2. **Cinq couleurs, cinq fonctions.** Rouge = direct (et il clignote). Citron = action principale et score en direct. Or = la note et le favori. Rose = le social (aimé, suivi, notification). Bleu = liens. Aucune couleur décorative. Plus une teinte par compétition, **uniquement** sur un filet de 3–4px à gauche du nom de la ligue.
3. **Tout chiffre est en mono tabulaire.** Scores, heures, notes, compteurs. C'est ce qui fait qu'un compteur passant de 9 à 127 en direct ne décale aucune mise en page. Notes avec un **point** décimal : `4.5`, jamais `4,5`.

Le mode sombre est le mode de conception (usage du soir, deuxième écran). Le mode clair est un miroir fonctionnel, sans recherche particulière.

## Typographie

Deux familles, chargées depuis Google Fonts :

```html
<link href="https://fonts.googleapis.com/css2?family=Archivo:ital,wdth,wght@0,62..125,400..900;1,62..125,400..700&family=Martian+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
```

**Archivo** est une variable font dont on exploite l'axe de largeur (`font-stretch`) comme hiérarchie :

| Rôle | Réglage | Usage |
| --- | --- | --- |
| Display | `font-stretch: 125%`, `900`, 38–46px, `line-height: .94`, `letter-spacing: -.02em`, capitales | Titre d'écran (« PARIS SG », « MES LIGUES ») |
| Titre de carte | `112%`, `800`, 13.5–20px, capitales | « PARIS SG — MARSEILLE » |
| Section | `75%`, `800`, 14–15px, `letter-spacing: .16em`, capitales | « REVIEWS POPULAIRES » |
| Libellé / bouton / statut | `75%`, `700`, 10.5–13px, `letter-spacing: .12–.2em`, capitales | boutons, champs, statuts |
| Corps | `100%`, `400`/`600`, 14–15.5px, `line-height: 1.5–1.6` | texte des reviews, commentaires |

**Martian Mono** avec `font-variant-numeric: tabular-nums`, 10–40px, pour **tous** les chiffres et les méta-informations horodatées.

Planchers : jamais de texte informatif sous 11px, jamais de cible tactile sous 44px (`--fb-control`).

---

## Jetons de design

Tous dans **`tokens.css`** (couleurs sombre + clair, teintes de compétition, échelle d'espacement base 4, rayons, hauteurs de contrôle, hachures, keyframes, classes typographiques, classes de statut). À importer dans `globals.css` ; les variables `--background` / `--foreground` / `--text-primary` / `--text-secondary` existantes peuvent être aliasées dessus (`--text-primary: var(--fb-text)`) pour une migration progressive.

Résumé des valeurs les plus utilisées :

- Fond `#0A0C11` · surface `#121620` · surface-2 `#1A1F2B` · trait `#262D3B`
- Texte `#F2F4F8` (15:1) · secondaire `#A6AEBF` (7.8:1) · tertiaire `#8A93A6` (5.4:1)
- Direct `#FF3B2F` · action `#A8E63A` · note `#F5B841` · social `#FF7BB0` · lien `#5B8CFF`
- Rayons : carte 16px, ligne 12px, afficheur de score 7px, pilule 999px
- Espacement : 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 64 — padding de carte 20px, gouttière de colonnes 40px, respiration entre sections 64px
- Trait : toujours 1px, sauf le souligné de section et le lien de nav actif (2px)

---

## Composants

### La carte unique (le composant le plus important)

**Une seule coque réutilisée pour quatre usages** — reviews populaires, reviews des gens suivis, matchs populaires, cartes du profil. Ne créez pas de variantes divergentes : ce sont des slots qui s'activent ou non.

Ancrage visuel imposé : **les deux écussons, à gauche**, superposés avec un chevauchement de 11–13px (l'écusson extérieur passe par-dessus via `margin-left: -12px`). C'est le repère constant de toute l'app.

Structure (de haut en bas, dans la colonne de droite de la carte) :

1. Filet de compétition 3px + nom de la ligue en `.fb-label`, couleur `--fb-text-2`
2. Titre de carte (`.fb-card-title`) + afficheur de score (`--fb-surface-2`, trait 1px, rayon 7px, `padding: 2px 8px`, `white-space: nowrap`)
3. Note : barre d'étoiles + valeur en mono `--fb-rating` + avatar 20px + pseudo
4. Extrait de review, **tronqué à ~100 caractères** suivis de `…`
5. Compteurs : `♥ 127` (cœur en `--fb-social` si aimé) et `💬 14`, en mono tabulaire, `white-space: nowrap`

Dimensions : carte `padding: 18px`, rayon 16px, `gap: 14px` entre écussons et contenu. Écussons : 36px (carte standard), 28px (carte compacte du profil), 34px (ligne de liste), 64px (en-tête de match). Avatars : 48 / 40 / 32 / 28 / 24 / 20px.

Hover : `border-color: #3B4557` et, pour une carte cliquable, `background: #161B25`. Aucune ombre, aucun `transform`.

### Notes en étoiles — 0.5 → 5, par pas de 0.5

**Ne rendez jamais une demi-note avec une étoile pleine.** Technique imposée, en lecture comme en saisie : cinq étoiles `--fb-star-empty` (`#2B3444`) et, en superposition absolue, les mêmes cinq étoiles en `--fb-rating` dans un conteneur `overflow: hidden` dont la largeur vaut `note / 5 * 100%`.

```html
<span class="fb-stars"> <!-- position: relative; display: inline-block; white-space: nowrap; color: var(--fb-star-empty) -->
  ★★★★★
  <span style="position:absolute; left:0; top:0; overflow:hidden; white-space:nowrap; color:var(--fb-rating); width:90%">★★★★★</span>
</span>
```

Tailles : 34px (sélecteur du formulaire), 26px (détail de match), 17px (review développée), 14px (carte), 12px (liste compacte).

**Sélecteur** (formulaire « Logger le match ») : au-dessus des 5 étoiles, dix zones cliquables invisibles en `flex: 1` (`position: absolute; inset: 0; display: flex`) donnant les dix valeurs. Survol → aperçu de la note ; `onMouseLeave` sur le conteneur → retour à la valeur sélectionnée. La valeur numérique est affichée à côté en mono 22–24px `--fb-rating`, format `4.5/5`.

### Boutons

| Niveau | Style | Hauteur |
| --- | --- | --- |
| Principal | fond `--fb-action`, texte `#0A0C11`, `.fb-label` en 13px, pilule ; hover `--fb-action-hover` | 44–50px |
| Secondaire | transparent, trait `--fb-border`, texte `--fb-text` ; hover fond `--fb-surface-2` | 44px |
| Tertiaire | texte seul `--fb-text-2` ; hover `--fb-text` | 44px |
| Destructif | trait `rgba(255,59,47,.4)`, texte `--fb-live-text` ; hover fond `--fb-live-bg` | 38–44px |
| Désactivé | fond `--fb-surface-2`, texte `--fb-disabled-fg`, `cursor: not-allowed` | — |
| En cours | fond `--fb-action-pressed`, libellé « Envoi… » — **pas d'animation** | — |
| Connexion externe | pleine largeur, rayon 12px, fond `--fb-surface`, trait 1px, jamais coloré, logo 20×20 à gauche | 48px |

États sociaux (aimé, favori) : fond teinté à 14 % + bordure pleine de la couleur, jamais la couleur seule sur le texte. Compteurs en mono tabulaire pour que la largeur du bouton ne bouge pas de 9 à 127.

### Champs

Hauteur 46–50px, rayon 12px (999px pour un champ de commentaire ou de filtre), fond `--fb-bg` ou `--fb-surface`, trait `--fb-border`. Focus : `border-color: var(--fb-action)` + `outline: none`. Erreur : trait `--fb-live`, libellé `--fb-live-text`, et sous le champ un message précédé d'un point rouge de 7px. Textarea : `min-height: 104–110px`, `resize: vertical`.

### Pilules de sélection (dates, ligues)

`padding: 10–11px 14–15px`, pilule, `.fb-label` en 12.5px. Sélectionnée : fond `--fb-action`, texte `#0A0C11`. Non sélectionnée : transparent, trait `--fb-border`, texte `--fb-text-2`. Format de date **abrégé + numérique** : `JEU. 17/09` (pas « jeudi 17 septembre »), dans la locale du navigateur.

### Badges

- **Badge live par ligue** : cercle rouge `--fb-live`, texte blanc, mono tabulaire 12.5px, `min-width: 26px; height: 24px; padding: 0 8px` — tient jusqu'à 3 chiffres. Animation `fb-halo` de 1,8s en boucle. Affiché seulement si > 0.
- **Badge de notification** : pastille `--fb-social`, texte `#0A0C11`, en exposant sur la cloche (`position: absolute; top: -3px; right: -3px`) avec une bordure de 2px de la couleur du fond pour le détacher.
- **Afficheur de score** : voir carte unique. En direct, le score passe en `--fb-action` — c'est le seul endroit de l'app où un score est coloré.
- **Pastille « Ta note »** : sur sa propre review, fond `--fb-rating-bg`, trait `--fb-rating`, texte `--fb-rating`, `.fb-label` en 10.5px.

### Les 7 statuts de match

Règle non négociable : **la couleur ne porte jamais seule l'information.** Trois canaux empilés — le libellé français toujours écrit, un traitement typographique (barré / grisage / capitales plus espacées), et la couleur seulement pour les deux états qui demandent un regard.

| Statut | Libellé | Traitement | Donnée affichée |
| --- | --- | --- | --- |
| `scheduled` | — | — | heure, `--fb-text-2` |
| `live` | « En direct 67' » | point rouge 8px, animation `fb-blink` 1,1s | score en `--fb-action` |
| `finished` | « Terminé » | `--fb-text-3` | score |
| `postponed` | « Reporté » | `letter-spacing: .2em`, titre en `--fb-text-2` | heure **barrée** |
| `cancelled` | « Annulé » | `letter-spacing: .2em`, **titre barré** en `--fb-text-3` | aucune |
| `suspended` | « Suspendu » | carré (non rond) 8px `--fb-rating`, `letter-spacing: .2em` | score |
| `abandoned` | « Abandonné » | `letter-spacing: .2em`, titre en `--fb-text-2` | score **barré** |

Reporté et annulé restent volontairement gris : ce ne sont pas des alertes. Ton factuel, aucune légèreté sur ces états.

### Chargement

Squelettes qui **reprennent la géométrie de la carte réelle** (mêmes hauteurs, mêmes rayons), fond `--fb-surface`, animation `fb-skel` 1,4s avec un décalage de 0,1s par ligne. Jamais un « Chargement… » en texte nu.

### États vides — deux familles distinctes

- **Vide de contenu** (aucun match ce jour-là, aucune review, aucune notification) : cadre en **pointillés** `--fb-border-strong`, fond `--fb-hatch`, titre en `.fb-card-title` 16–20px + une phrase en `--fb-text-2`. **Aucune action.**
- **Vide social** (tu ne suis personne, connecte-toi) : cadre **plein** `--fb-border` sur `--fb-bg`, même typographie, **plus un bouton**. C'est une invitation, pas un constat.

### Navigation

**Écart assumé à la spec** (à valider côté produit) : la nav ne porte que **2 liens** — Accueil, Recherche — au lieu de 4. Le profil se rejoint par la pastille avatar + pseudo à droite ; les notifications par une **cloche** (SVG 19px, `stroke-width: 1.8`) portant le compteur en badge. Motif : « Profil » en lien texte alors que le nom de l'utilisateur est déjà cliquable à droite était redondant.

- Emplacement du futur logo réservé à gauche : carré 34px, rayon 9px, `margin-right: 14px`.
- Lien actif : `border-bottom: 2px solid var(--fb-action)` + poids 700.
- Non connecté : pas de cloche ni d'avatar, mais « Connexion » (secondaire) et « Inscription » (principal).
- **Pas de bandeau global de matchs en direct** (autre écart assumé) : il y a presque toujours un match en cours, un bandeau permanent devient du bruit. Le direct se signale là où il a du sens.

---

## Écrans

Ordre de priorité d'implémentation = l'ordre ci-dessous.

### 1. Accueil — `Accueil.dc.html` → `app/page.tsx`

Deux colonnes, gauche plus large (`minmax(0, 1.35fr)` / `minmax(0, 1fr)`, gouttière 40px), largeur max ~1240px.

**Colonne de gauche — « Mes ligues »** : titre + lien « Toutes les ligues » ; sélecteur de 5 dates (aujourd'hui + 4) ; liste des ligues ayant au moins un match à la date choisie. **Tri : favorites d'abord (marquées ★ `--fb-rating`), puis le reste par ordre alphabétique.** Chaque ligne : filet de compétition + écusson 24px + nom + badge live rouge si > 0. Ligne entièrement cliquable → détail de la ligue à la date sélectionnée. Non connecté : toutes les ligues du jour, sans tri favoris ni étoile.

**Colonne de droite — 3 sections empilées** : reviews populaires (**fenêtre de 48h**), matchs populaires (les plus reviewés), reviews des gens suivis. Les trois utilisent la carte unique. Non connecté : la section « gens suivis » devient un vide social avec bouton de connexion.

### 2. Détail d'un match — `Match.dc.html` → `app/matches/[id]/page.tsx`

En-tête : filet + nom de la ligue et journée ; les deux équipes en Display 40px avec écussons 64px de part et d'autre de l'afficheur de score 34px ; sous le score, le statut (« En direct 67' » avec point clignotant, ou « Terminé ») ; ligne de méta (date/heure locale · stade · nombre de reviews) et, à droite, « Voir les highlights ↗ » si un lien existe (nouvel onglet, `rel="noopener noreferrer"`).

Deux colonnes en dessous : à gauche le formulaire puis les reviews ; à droite les faits de match, les compositions et la distribution des notes.

- **Formulaire « Logger le match »** : visible seulement si connecté **et** si l'utilisateur n'a pas déjà noté ce match. Sélecteur d'étoiles + textarea optionnelle + bouton « Logger ». Si déjà loggé : bandeau de rappel avec la note donnée + « Modifier ma note ». Non connecté : cadre hachuré « Connecte-toi pour noter ce match » + bouton.
- **Reviews** : la carte de review développée (avatar 40px, pseudo, horodatage, note à droite, texte intégral **non tronqué**, puis barre d'actions). **Sa propre review est identifiable** : trait `--fb-rating`, fond légèrement plus chaud (`#15161A`), pastille « Ta note », et c'est la seule à porter le menu `···` (Modifier ma note / Supprimer). Attention : quand le formulaire de saisie est affiché, sa propre review **ne doit pas** apparaître dans la liste (et le compteur est diminué d'autant).
- **Actions de review** : `♥ / ♡` avec compteur, `💬 n déplier/replier` qui ouvre le fil de commentaires (auteur + texte, avatar 28px, plus un champ d'ajout en pilule si connecté ; sinon « Connecte-toi pour répondre »).
- **Faits de match** (ajout produit, hors spec d'origine) : timeline du plus récent au coup d'envoi — minute, marqueur de forme distincte par type, libellé, joueur, équipe. But = disque `--fb-action` ; carton jaune = rectangle 9×13 `--fb-rating` ; rouge = rectangle `--fb-live` ; but refusé et penalty manqué = disque gris **et libellé barré**. En direct, on ne montre que les faits jusqu'à la minute en cours, et **le score affiché est dérivé du dernier but de cette timeline** (ne jamais le coder en dur : les deux se contrediraient).
- **Compositions** : deux colonnes, 11 titulaires à plat. L'API ne fournit ni formation ni remplaçants — ne prévoyez pas de terrain tactique. Si indisponible : cadre hachuré « Compositions indisponibles ».
- **Distribution des notes** : moyenne en mono 40px `--fb-rating` + histogramme 5→1 (barres 8px, `--fb-rating` sur `--fb-surface-2`).

### 3. Détail d'une ligue — `Ligue.dc.html` → `app/leagues/[id]/page.tsx`

Lien retour vers l'accueil ; en-tête (écusson 56px, filet, pays/type, nom en Display 44px) + bouton favori ☆/★ à droite (absent si non connecté) ; le même sélecteur de 5 dates ; liste des matchs **de cette ligue seule**, une ligne = `<a>` vers le détail du match (écussons 34px, titre, statut, score ou heure). C'est l'écran de référence pour les 7 statuts : ils y sont tous représentés. Vide : « Aucun match ce jour-là ».

### 4. Profil — `Profil.dc.html` → `app/profile/page.tsx`

Avatar 96px + pseudo en Display 46px + « Modifier le profil » ; bande de 4 statistiques (followers, suivis, matchs notés toutes saisons, vus cette saison — la dernière en `--fb-action`), en grille de 1px sur fond `--fb-border` ; puis deux sections de 4 cartes **sur une seule ligne** (`repeat(4, minmax(0, 1fr))`) : « Matchs préférés » (saison en cours, 4 mieux notés, note décroissante) et « Derniers matchs loggés » (saison en cours, 4 plus récents, date décroissante).

La carte de profil est une fiche verticale : filet + nom de la ligue, puis un mini-tableau d'affichage (une ligne par équipe : écusson 24px, nom, buts ; le vainqueur en poids 700 `--fb-text`, le perdant en 500 `--fb-text-2`), puis un pied séparé par un filet avec la date à gauche et la note à droite. Noms longs en ellipse.

Vide : « Ta saison commence ici » (vide social, avec bouton) pour les préférés, cadre hachuré pour les derniers loggés. Pas de vue « profil d'un autre utilisateur » pour l'instant.

### 5. Connexion / Inscription / après-inscription — `Connexion et inscription.dc.html`

Colonne centrée de 420px. Connexion : email + mot de passe, erreur générique « Email ou mot de passe incorrect. », séparateur « ou », Google et Apple. Inscription : pseudo (avec l'aide « c'est ce que les autres verront sur tes notes »), email, mot de passe (8 caractères minimum).

**Parcours après inscription** (proposition produit, à valider), conteneur 880px, barre de progression en 3 segments :

- Étape « Tes ligues » : grille de cartes sélectionnables (`repeat(auto-fill, minmax(268px, 1fr))`), filet + écusson + nom + ★/☆. Sélectionnée : trait `--fb-rating`, fond `--fb-rating-bg`. Compteur en bas ; **« Continuer » désactivé à zéro sélection** (compteur en rouge).
- Étape « Réglages » : club de cœur (optionnel, pilules d'équipes — ses matchs épinglés en haut de l'accueil) puis 5 préférences en interrupteurs (piste 50×28, pastille 20px ; active = `--fb-action`) : j'aime / réponses / nouveaux abonnés / rappel au coup d'envoi (ligues favorites seulement) / **masquer les scores** des matchs pas encore loggés jusqu'au clic.

### 6. Toutes les ligues — `Toutes les ligues.dc.html` → `app/leagues/page.tsx`

~85 compétitions. Champ de filtre en pilule (nom ou pays) ; deux groupes, « Tes favoris » puis « Tout le reste » **alphabétique** ; chaque ligne : filet + écusson 30px + nom + pays en mono 11px, badge live si > 0, bouton ☆ Ajouter / ★ Favori. Non connecté : un seul groupe alphabétique, pas de bouton favori, un bandeau invitant à se connecter.

### 7. Notifications — `Notifications.dc.html` → `app/notifications/page.tsx`

Colonne de 760px. Titre + « Tout marquer comme lu » si au moins une non lue. Chaque ligne : point rose 8px si non lue (gouttière de 12px réservée pour que les lignes lues restent alignées), avatar 38px, phrase (« **marie.dlm** a aimé ta note »), contexte en mono sur la ligne du dessous (match + note, ou extrait du commentaire entre guillemets), horodatage à droite. Non lue : poids 700, `--fb-text`, fond `--fb-surface-unread`. Clic → passe en poids 400, `--fb-text-2`. Sur une notification d'abonnement, un bouton « Suivre » en retour. Vide : « Aucune notification ». Non connecté : vide social avec bouton.

### 8. Recherche — `Recherche.dc.html` → `app/search/page.tsx`

Stub assumé : champ et bouton désactivés en hachures, pastille « Bientôt disponible », titre « On y travaille », une phrase d'explication (retrouver un match précis, trouver des gens à suivre), et une porte de sortie vers « Parcourir les ligues ». Le lien de repli « trouver des gens à suivre » depuis l'accueil pointe ici.

---

## Interactions et comportements

- **Aimer** : bascule immédiate, compteur ±1, pas de requête bloquante visible. `♡` → `♥`, bordure et fond teintés.
- **Fil de commentaires** : déplié / replié localement, le libellé du bouton change (« déplier » / « replier »).
- **Sélecteur de note** : survol = aperçu, sortie du conteneur = retour à la valeur choisie, clic = sélection. Dix valeurs.
- **Favori de ligue** : bascule optimiste ; sur l'accueil, la ligue remonte dans le groupe des favorites.
- **Notification** : clic = marquée comme lue (poids et fond changent), ne disparaît pas de la liste.
- **Menu `···`** : ouverture au clic, panneau absolu à droite (`top: 44px`, `min-width: 168px`, rayon 12px, fond `--fb-surface-2`, ombre `0 12px 28px rgba(0,0,0,.5)` — la seule ombre de tout le système, parce qu'un panneau flottant en a besoin).
- **Transitions** : aucune n'est requise. Si vous en ajoutez, `120–160ms ease-out` sur `background-color` et `border-color` uniquement. Les seules animations du système sont `fb-blink`, `fb-halo` et `fb-skel` — rien d'autre ne doit bouger, sinon le direct perd sa valeur de signal.
- **Accessibilité** : le direct ne doit pas dépendre que du clignotement (le libellé est écrit). Respectez `prefers-reduced-motion` en neutralisant les trois animations — le point rouge reste alors plein et le squelette statique.

## État à prévoir côté composants

Par écran : `status` de chargement, drapeau d'authentification, date sélectionnée (accueil, ligue), note et commentaire en cours de saisie (match), `liked` / `likeCount` par review, ouverture du fil par review, ouverture du menu par review, `read` par notification, ensemble des ligues favorites, et pour l'onboarding : ligues sélectionnées, club, préférences.

Les données affichées dans les maquettes sont réalistes mais **factices** (vrais clubs et ligues européennes, notes par pas de 0.5, dates plausibles de septembre 2026). À remplacer intégralement par l'API.

## Responsive

Aucune maquette mobile n'a été produite — mais aucun écran ne doit casser. Règles à appliquer :

- Les deux colonnes de l'accueil et du détail de match passent en une seule colonne sous ~900px, le contenu social d'abord sur l'accueil.
- Les grilles de 4 cartes du profil passent en 2 colonnes puis 1.
- Le sélecteur de dates devient scrollable horizontalement plutôt que de passer à la ligne.
- Les titres Display descendent d'environ un tiers (46px → 30px).
- Les paires d'écussons, les afficheurs de score et les compteurs gardent `white-space: nowrap` : c'est ce qui les empêche de se couper en deux en colonne étroite.
- Rien sous 44px de hauteur cliquable.

## Assets à fournir

| Asset | Où | Emplacement réservé |
| --- | --- | --- |
| Écussons d'équipes (TheSportsDB) | cartes, en-têtes, listes | cercles 20/24/28/30/34/36/64px, fond `--fb-hatch-avatar` |
| Logos de ligues (TheSportsDB) | listes de ligues, en-tête de ligue | cercles 24/26/30/56px |
| Avatars (Dicebear par défaut) | nav, reviews, commentaires, profil | cercles 20/24/28/32/38/40/48/96px |
| Logos Google et Apple | boutons de connexion externe | carrés 20×20 |
| Logo du produit | nav, écrans d'auth | carré 34px (nav), 44px (auth), rayon 9–11px |

## Fichiers de ce bundle

| Fichier | Contenu |
| --- | --- |
| `tokens.css` | **la source de vérité** des valeurs — couleurs sombre et clair, teintes de compétition, espacement, rayons, keyframes, classes typographiques et de statut |
| `Direction artistique v2.dc.html` | la direction argumentée : palette, typographie, ambiance, les 7 statuts, ce que le système refuse |
| `Design system.dc.html` | tous les composants et leurs états, plusieurs sont interactifs (note, j'aime, favori, fil) |
| `Accueil.dc.html` | écran 1, avec ses états |
| `Match.dc.html` | écran 2, 7 états sélectionnables en haut de page |
| `Ligue.dc.html` | écran 3, référence des 7 statuts |
| `Profil.dc.html` | écran 4 |
| `Connexion et inscription.dc.html` | écran 5 + parcours après inscription |
| `Toutes les ligues.dc.html` | écran 6 |
| `Notifications.dc.html` | écran 7 |
| `Recherche.dc.html` | écran 8 (stub) |

Dans chaque fichier d'écran, la barre du haut permet de basculer entre les états (chargement, vide, connecté / non connecté, statuts) : c'est un outil de revue, **il ne fait pas partie du design** et ne doit pas être implémenté.

## Ton de l'interface

Direct, complice, esprit fan, jamais corporate, aucun emoji hors `♥` et `💬`. Tutoiement partout. Actif plutôt que passif. Les vides sociaux sont des invitations, pas des constats. Les statuts sensibles (abandonné, suspendu) restent factuels.

Lexique imposé : logger / loggé, ta note, coup d'envoi, en direct, tes ligues, favori ★, suivre (jamais « s'abonner »), aimer (jamais « liker »), populaire, palmarès, reviews, composition.
