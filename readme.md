# Battle for Penumbra – Mappa & Catalogo Carte

Sito statico completo con:
- Mappa esagonale **esatta** (159 celle) secondo le specifiche tecniche
- Catalogo carte versione 3.0
- Tema scuro, interattivo (zoom, pan, hover)

## Come metterlo online (100% gratis)

### Opzione consigliata (StackBlitz → GitHub → Cloudflare Pages) 

1. Vai su https://stackblitz.com
2. Clicca **Open WebContainer** o crea nuovo progetto **Vanilla** / **HTML**
3. Cancella i file di default
4. Crea un file `index.html` e incolla tutto il contenuto di questo file
5. Il sito funziona subito nella preview
6. Clicca su **Connect repository** / **Export to GitHub** e crea un nuovo repository
7. Vai su https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
8. Seleziona il repository e fai deploy (lascia le impostazioni di default)
9. Ottieni un link tipo `tuoprogetto.pages.dev`

### Alternativa velocissima (solo GitHub Pages)
1. Crea un repository su GitHub
2. Carica il file `index.html` nella root
3. Vai in **Settings → Pages** → Source: Deploy from branch → main → / (root)
4. Dopo 1 minuto il sito sarà su `https://tuousername.github.io/nome-repo`

## Controlli effettuati
- Esattamente 70 montagne + 84 pianure + 4 templi + 1 altare = **159 celle**
- Coordinate e formule pointy-top rispettate
- Colori secondo specifica
- Etichette Templi A/B/C/D presenti
