# Releases et déploiement

Une seule version SemVer pour tout le repo (tags `vX.Y.Z`). **Merger dans `main` ne déploie rien** : on déploie en **publiant une Release GitHub**, à la main, quand on est prêt à livrer. La publication crée le tag, build les 3 images, les pousse sur ghcr.io et déploie ce tag sur le VPS.

Fichier concerné : [`.github/workflows/release.yml`](./.github/workflows/release.yml).

## Le circuit

```
1. Chaque PR est rattachée à une milestone (ex. « v1.3.0 ») et mergée dans main   ← rien n'est déployé
2. Quand la milestone est prête : Releases → Draft a new release
3. Tag vX.Y.Z (créé à la publication, cible : main) → Generate release notes → Publish
4. Le workflow Release : build api/worker/web → push ghcr.io (:vX.Y.Z, :<sha>, :latest)
   → déploiement sur le VPS (TAG=vX.Y.Z dans le .env, pull, migrations Prisma, up -d)
5. Fermer la milestone
```

La milestone est un outil de **suivi** : elle te dit ce qui doit être mergé avant de livrer. Elle n'est pas reliée au déploiement — c'est le tag de la Release qui compte.

## Faire une release

1. **Vérifier la milestone** : toutes ses PR sont mergées dans `main`, plus rien d'ouvert.
2. GitHub → **Releases** → **Draft a new release**.
3. **Choose a tag** → saisir `vX.Y.Z` (format strict, ex. `v1.3.0`) → **Create new tag on publish**. Cible : `main`.
4. **Generate release notes** : GitHub liste les PR mergées depuis le tag précédent, classées par label (`feature`, `bug`, `breaking`… voir [`.github/release.yml`](./.github/release.yml)). Retoucher si besoin.
5. **Publish release**. Suivre le run *Release* dans l'onglet **Actions**.
6. Fermer la milestone.

Choix de la version (SemVer) : `patch` pour des corrections, `minor` pour des nouveautés compatibles, `major` pour un changement incompatible. Avant la 1.0, on reste en `0.x.y`.

Les **pré-releases** (case « Set as a pre-release ») et les **brouillons** ne déclenchent rien.

## Hotfix en prod

`main` peut contenir des PR de la prochaine version qui ne sont pas encore livrées : on ne veut pas les embarquer dans un correctif urgent. On part donc du **tag actuellement en prod**, pas de `main`.

```bash
git fetch --tags
git checkout -b hotfix/v1.3.1 v1.3.0        # v1.3.0 = version actuellement en prod
# … corriger, tester …
git commit -am "fix: description du correctif"
git push -u origin hotfix/v1.3.1
```

1. Ouvrir une PR `hotfix/v1.3.1` (relecture), **sans la merger dans `main` tout de suite**. Le label `hotfix` la classe dans les notes.
2. **Releases → Draft a new release** : tag `v1.3.1`, **cible : la branche `hotfix/v1.3.1`** (pas `main`) → Publish. Le workflow build ce commit et le déploie.
3. **Reporter le correctif dans `main`** pour ne pas le perdre à la prochaine release : merger la PR de hotfix dans `main` (ou `git cherry-pick`).

⚠️ La branche de hotfix ne contient que les migrations Prisma déjà présentes dans le tag de départ. Comme `main` n'est jamais déployé sans release, la base de prod est au schéma de `v1.3.0` : c'est cohérent. Si le correctif ajoute une migration, l'ajouter aussi dans `main` avec un timestamp cohérent.

Le tag `latest` est déplacé sur l'image du hotfix ; sans conséquence, le VPS utilise `TAG` du `.env`.

## Rollback (revenir à une version précédente)

Actions → **Release** → **Run workflow** → champ `tag` = version à remettre (ex. `v1.2.0`).

Le workflow **saute le build** : il copie le `docker-compose.prod.yml` *de ce tag* sur le VPS, met `TAG=v1.2.0` dans le `.env`, `pull`, migrations, `up -d`. Les images de ce tag doivent exister sur ghcr.io (elles y restent).

⚠️ **Les migrations Prisma ne sont pas annulées.** La base garde le schéma de la version la plus récente. Le rollback n'est sûr que si l'ancienne version reste compatible avec ce schéma (migrations additives : ajout de colonne/table). Si une migration a supprimé ou renommé quelque chose, l'ancien code peut planter : il faut alors un hotfix avec migration corrective. Pour limiter le risque, préférer des migrations en deux temps (ajouter, puis supprimer une release plus tard).

Rollback ou hotfix ? Rollback = retour immédiat à une version connue saine. Hotfix = corriger vers l'avant. En cas d'urgence : rollback d'abord, hotfix ensuite.

## Réglages GitHub (une seule fois)

- Créer les labels utilisés par les notes de release : `feature`, `enhancement`, `bug`, `fix`, `hotfix`, `breaking`, `ignore-for-release` (optionnel : sans label, une PR va dans « Autres changements »).
- Secrets du déploiement : `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`.
- Aucun réglage « Allow GitHub Actions to create pull requests » n'est nécessaire (plus de bot de release).

## Dépannage

| Symptôme | Cause probable |
|---|---|
| Rien ne se passe à la publication | Release en pré-release ou brouillon ; ou workflow absent de la branche par défaut |
| `Tag invalide` | Le tag doit être exactement `vX.Y.Z` (pas de `1.3.0` sans `v`, pas de suffixe) |
| Build échoué après la publication | Le tag et la Release existent déjà. Actions → run *Release* → **Re-run failed jobs**. Ne pas utiliser le rollback : il saute le build |
| `manifest unknown` au `pull` sur le VPS | Les images de ce tag n'ont pas été poussées (build échoué) |
| Le VPS n'a pas la bonne version | Vérifier la ligne `TAG=` du `.env` dans `/opt/apps/football-app` |
