# Devis Generator

Application web Node.js pour créer et gérer des devis (MVP).

## Fonctionnalités

- Authentification avec rôles (`admin`, `commercial`)
- Gestion des clients
- Création de devis avec lignes multiples (quantité, prix, TVA)
- Calculs automatiques (remise, TVA multiple, acompte, reste à payer)
- Statuts de devis (`draft`, `validated`, `sent`) + historique
- Mentions légales en texte libre
- Échéancier de paiement en texte libre
- Génération PDF
- Partage (simulation d’envoi email via changement de statut)

## Lancer le projet

```bash
npm install
npm run dev
```

Puis ouvrir `http://localhost:3000`.

## Comptes de démonstration

- `admin` / `admin123`
- `commercial` / `commercial123`

## Scripts

- `npm run dev` : démarrage en mode développement
- `npm start` : démarrage standard
- `npm test` : tests unitaires des règles de calcul

## Données

Une base SQLite (`data.sqlite`) est créée automatiquement au premier démarrage.
