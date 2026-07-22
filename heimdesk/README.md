# IT Heimdesk

Interne IT-Ticketverwaltung der Digitalwerkstatt Thalfang – ohne Backend, ohne
Build-Schritt. Reines HTML/CSS/JS, die Daten liegen im `localStorage` des
Browsers.

## Funktionen

- **Tickets anlegen** – Titel, Melder:in, Kategorie, Priorität und Beschreibung.
- **Status ändern** – *Offen → In Arbeit → Erledigt* direkt am Ticket.
- **Tickets löschen** – einzelnes Ticket per „Löschen“-Button (mit Rückfrage und
  „Rückgängig“ direkt danach) oder alle erledigten Tickets auf einmal über
  „Erledigte löschen“.
- **Filtern** nach Status und eine kleine Übersicht im Kopfbereich.

## Nutzung

```bash
cd heimdesk
python3 -m http.server 8000   # → http://localhost:8000
```

Alternativ die `index.html` einfach direkt im Browser öffnen.

## Dateien

- `index.html` – Aufbau und Ticket-Vorlage (`<template>`)
- `style.css` – Design im Digitalwerkstatt-Look
- `script.js` – Ticket-Logik (Anlegen, Status, Löschen, Speichern)

> Hinweis: Die Daten werden nur lokal im jeweiligen Browser gespeichert. Für
> einen echten Mehrbenutzerbetrieb wäre ein Backend nötig.
