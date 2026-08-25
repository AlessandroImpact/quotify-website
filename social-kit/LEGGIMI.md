# Quotify — Social Kit

Tutto quello che serve per aprire e far partire i profili Facebook e Instagram.

```
doc/       01 campi da incollare · 02 strategia · 03 caption pronte
           04 pixel e dominio · 05 checklist e cose da sistemare
logo/      icona ufficiale dell'app (1024), marchio bianco su trasparente,
           wordmark per fondo chiaro e per fondo scuro
profilo/   avatar 1080 e 320, copertina Facebook 1640×856
highlight/ 6 copertine per le storie in evidenza (1080×1080)
post/      3 post pronti + 1 template vuoto (1080×1350)
```

**Handle scelto: @quotifyit** — verificato libero su Instagram il 25/08/2026.

Da leggere per primo: `doc/05-checklist-e-cose-da-sistemare.md`.

## Sul logo
Tutti gli asset usano il **marchio originale dell'app** — la Q con lo scontrino —
preso da `Quotify App/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`
(1024×1024, la versione con l'inquadratura corretta; quella in root del repo è 1024×1020,
leggermente schiacciata).

`marchio-bianco-trasparente.png` è lo stesso marchio scontornato dal fondo blu: serve
per metterlo su copertine, video e qualsiasi fondo colorato senza il riquadro.

Blu del marchio: **`#236CEF`**. È il valore campionato dall'icona vera — lo stesso in
`app-icon-1024.png`, nelle favicon e negli apple-touch-icon di entrambi i siti.

Storico: qui era annotato `#236EF2`, che era una lettura approssimata di 2-3 punti; il
sito usava `#2563eb`, cioè il blue-600 di Tailwind mai allineato. Allineati entrambi al
valore misurato il 25/08/2026 — ora `--color-primary-600` vale `#236CEF` in tutti e due
i repo, incluse email, PDF dei preventivi, widget e overlay di lancio iOS.
