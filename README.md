# Tillsynsmanualen

Version 2.2.19

## Kodformaterare

Koden använder sig av [Prettier](https://prettier.io/) där specifika formateringsinställningar sätts i [.prettierrc](.prettierrc).

För att kunna nyttja Prettier och formatera koden krävs att npm finns installerat på den lokala maskinen och är nåbar genom `npm`.

Installera projektets dependencies, inklusive prettier, genom `npm install`.

För att formatera koden direkt genom VS Code ska pluginet [Prettier - Code formatter](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) installeras. Det förutsätter att följande inställning finns i VS Code `settings.json`

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true
}
```

### Kommandon för formatering och validering

|                        | Formatera                                   | Validera                                    |
| ---------------------- | ------------------------------------------- | ------------------------------------------- |
| Alla Filer             | `npm run format`                            | `npm run validate`                          |
| En Fil                 | `npx prettier --write path/till/fil.js`     | `npx prettier --check path/till/fil.js`     |
| Filer under en katalog | `npx prettier --write path/till/katalog/**` | `npx prettier --check path/till/katalog/**` |
