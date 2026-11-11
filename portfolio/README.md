# FLUXE Studio – Website

Mehrseitige Website mit Apple-artiger Navigation (Flyout-Menüs, Tabs), Branchenfilter, Preisen mit Katalog,
Gratis-Check, Karriere, Team, FAQ, Kontaktformular und Terminbuchung.

| Seite | Datei |
|---|---|
| Start (Visitenkarte + Showreel) | `index.html` |
| Arbeiten mit Branchenfilter | `arbeiten.html` (Filter per Link, z. B. `arbeiten.html#automotive`) |
| Leistungen | `leistungen.html` |
| Preise, Katalog, Preisrechner | `preise.html` |
| Gratis-Check | `check.html` |
| Über mich & Team | `ueber-mich.html` (`#team`) |
| Karriere | `karriere.html` |
| FAQ | `faq.html` |
| Kontakt & Termin | `kontakt.html` (`#termin`) |
| Rechtliches | `impressum.html`, `datenschutz.html`, `agb.html`, `bildnachweise.html` |

## Was du anpassen musst

**Alle persönlichen Daten stehen in `config.js`.** Leere Felder werden automatisch ausgeblendet oder als
„Demnächst verfügbar“ angezeigt (z. B. Terminbuchung, WhatsApp-Button, Telefon).

**Inhalte** (Projekte, Branchen, Preise, Katalog, Stellen, Team, FAQ, Kundenstimmen) stehen in `data.js`.
Ein neues Projekt in `PROJECTS` taucht automatisch in seiner Branche auf; Branchen ohne Projekt zeigen
„Demnächst verfügbar“. Stellen in `JOBS` eintragen – solange leer, gibt es nur die Initiativbewerbung.

## E-Mail: so kommen Anfragen bei dir an

Alle Formulare (Projektanfrage, Gratis-Check, Bewerbung) senden über **Web3Forms** an deine E-Mail-Adresse.
Die Website liegt auf GitHub Pages (ohne eigenen Server), deshalb braucht es diesen Dienst.

1. E-Mail-Adresse anlegen (z. B. `hallo@deinedomain.de`).
2. Auf **web3forms.com** die Adresse eingeben → du bekommst per Mail einen **Access Key**.
3. In `config.js` eintragen: `email: 'hallo@…'` und `web3formsKey: 'dein-key'`.
4. Einmal das Formular testen – die Anfrage kommt als E-Mail mit allen Feldern an, „Antworten“ geht direkt an den Kunden.

Ohne Key öffnet das Formular als Notlösung das E-Mail-Programm des Besuchers (wenn `email` gesetzt ist).

## Terminbuchung

Kostenloses Konto auf **cal.com** anlegen, Ereignis „Erstgespräch“ (15–30 Min.) erstellen und den Link-Teil
(z. B. `mika-wittenborn/erstgespraech`) in `config.js` bei `calLink` eintragen. Der Kalender lädt erst nach
Klick (Datenschutz). Alternativ geht auch Calendly – dann die Einbindung in `site.js` (`SITE.booking`) anpassen.

## Vor dem Start

- Impressum: Anschrift in `config.js` (`street`, `zip`).
- Datenschutz & AGB: Vorlagen – mit eRecht24 / IT-Recht-Kanzlei vervollständigen.
- Preise in `data.js` sind Vorschläge.
- Fotos fürs Team: Datei nach `img/team/` und Pfad bei `TEAM` eintragen.
