# StarUp

StarUp est un outil de monitoring de métriques HTTP.

L'objectif initial est de suivre dans le temps des métriques publiques telles que :

- likes
- vues
- commentaires
- téléchargements
- abonnés
- toute valeur numérique exposée par HTTP

## Stack

- TypeScript
- Fastify
- PostgreSQL
- React
- Vite
- Docker

## Architecture

~~~text
Site surveillé
      |
      | HTTP
      v
StarUp Collector
      |
      v
PostgreSQL
      |
      v
API Fastify
      |
      v
Dashboard React
~~~

## Statut

Projet en cours de développement.
