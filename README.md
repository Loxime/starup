# StarUp

StarUp est un outil open source de monitoring de métriques numériques exposées sur le Web.

Il interroge périodiquement une URL HTTP, extrait une valeur depuis du HTML ou du JSON, stocke les mesures dans PostgreSQL et affiche leur évolution dans un dashboard.

## Cas d'usage

StarUp peut suivre par exemple :

- likes
- vues
- commentaires
- téléchargements
- abonnés
- toute autre valeur numérique accessible via HTTP

Le suivi commence lors de la création du monitor. StarUp ne reconstruit pas d'historique antérieur.

## Stack

- TypeScript
- Fastify
- PostgreSQL
- React
- Vite
- Recharts
- Docker

## Fonctionnalités

- monitors HTML avec sélecteur CSS
- monitors JSON avec chemin JSON
- collecte périodique
- historique 24h / 7j / 30j
- dashboard graphique
- check manuel
- pause et reprise des monitors
- suivi du dernier état healthy/error
- mémorisation des erreurs de collecte
- migrations PostgreSQL automatiques
- protection des cibles réseau privées en production
- image Docker autonome

## Démarrage avec Docker

~~~bash
git clone https://github.com/Loxime/starup.git
cd starup
docker compose up --build -d
~~~

StarUp est ensuite disponible sur :

~~~text
http://localhost:3000
~~~

Vérification :

~~~bash
curl http://localhost:3000/health
~~~

Arrêt :

~~~bash
docker compose down
~~~

Les données PostgreSQL sont conservées dans un volume Docker.

## Développement local

Copier la configuration :

~~~bash
cp .env.example .env
~~~

Installer les dépendances :

~~~bash
npm install
~~~

Démarrer PostgreSQL :

~~~bash
docker compose up -d postgres
~~~

Lancer l'API :

~~~bash
npm run dev:api
~~~

Dans un second terminal :

~~~bash
npm run dev:web
~~~

Le frontend de développement est disponible sur :

~~~text
http://localhost:5173
~~~

## Tests

~~~bash
npm test
npm run typecheck
npm run build
~~~

Smoke test Docker complet :

~~~bash
./scripts/smoke-test.sh
~~~

## Configuration

Variables principales :

~~~text
NODE_ENV=development
HOST=0.0.0.0
PORT=3000
DATABASE_URL=postgresql://starup:starup@localhost:5433/starup
ALLOW_PRIVATE_TARGETS=false
~~~

`ALLOW_PRIVATE_TARGETS=true` peut être utilisé en développement pour tester des URLs telles que `localhost`.

Il ne doit pas être activé sur une instance publique sans raison spécifique.

## Architecture

~~~text
Target HTTP
    |
    v
Collector
    |
    v
PostgreSQL
    |
    v
Fastify API
    |
    v
React Dashboard
~~~

## Docker

L'image de production expose le port `3000`.

Les migrations de base de données sont exécutées automatiquement au démarrage du conteneur.

## Release

Les tags Git `v*` déclenchent le workflow GitHub Actions de publication Docker.

Le dépôt GitHub doit disposer des secrets :

~~~text
DOCKERHUB_USERNAME
DOCKERHUB_TOKEN
~~~

L'image est publiée sous :

~~~text
DOCKERHUB_USERNAME/starup
~~~

## Statut

MVP.
