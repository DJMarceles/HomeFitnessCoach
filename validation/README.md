# Lokale praktijktest

De meetpagina draait alleen op de ontwikkelserver. De app voor sporters laadt alleen het Full-model met SDK 0.10.35. De meetpagina kan daarnaast Lite of een tweede SDK testen. Open bronvideo's rechtstreeks via de bestandskiezer. Bewaar ze met toestemming **buiten de projectmap**; gebruik setcodes in plaats van namen. Geen upload, geen videoframes, coördinaten of bestandsnamen in het downloadrapport.

## Reproduceren

Vanuit de projectmap:

```sh
npm ci
npm test
node validation/squat-check.mjs
npm run build
```

De laatste squatcheck vergelijkt acht identieke synthetische bewegingen met de regels, teller en feedback uit Git-commit `6704b108306b14aa08284084bd099f91c610443d` en de huidige versie. Hiervoor moet de commit lokaal beschikbaar zijn. Op de synthetische referentie is het resultaat acht tellingen in beide versies; de oude geeft een dieptetip, de nieuwe niet. Dit is geen oordeel van een trainer.

Voor de meetpagina maakt `node validation/prepare.mjs` de oude analyse onder de genegeerde map `.assets/` aan. De squatcheck doet dit ook. Beide modellen staan in `public/models/`. Alleen voor vergelijking met de extra SDK zijn deze voorbereidingen nodig:

```sh
mkdir -p validation/.assets/candidate
npm pack @mediapipe/tasks-vision@1.2.3 --pack-destination validation/.assets
tar -xzf validation/.assets/mediapipe-tasks-vision-1.2.3.tgz -C validation/.assets/candidate --strip-components=1
npm run dev -- --host 127.0.0.1
```

Open [de meetpagina](http://127.0.0.1:5173/validation/). Kies een lokale opname, een vaste anonieme setcode, oefening, SDK en model. Herhaal op dezelfde opname met dezelfde setcode. Elke run leest op vaste videoposities (80 ms) en vergelijkt de oorspronkelijke regels met gecorrigeerde 2D- en geschatte 3D-gewrichtshoeken. De 3D-variant verandert alleen de gewrichtshoeken; zichtcontrole en cameraoriëntatie blijven in beeldcoördinaten. De oorspronkelijke app is alleen de rij **baseline + 0.10.35 + Lite**; andere baseline-rijen testen de oude regels met een andere detector. De oude timer herkende geen statische plank.

## Met sporters

- Markeer per opname begin, voltooiing van elke herhaling, onderbrekingen en terugkeer in beeld. Noteer bij plank de werkelijk zichtbare houdtijd (proefdoel 20 s). Leg voor de eerste acht herhalingen of de houdtijd de terugkerende, zichtbare aandachtspunten vast met een trainer die de modeluitkomsten niet heeft gezien.
- Gebruik aparte personen voor afstelling en eindtest. Minstens 20 onafhankelijke dynamische testsets **per oefening**, plus negatieve scenario's en holds. Wissel lichaamsbouw, kleding, tempo, licht en camerahoek af. Zet testsets niet opnieuw in als afstelmateriaal.
- Elke opname krijgt één regel in een lokaal JSON-array. Voorbeeld (alle tijden vanaf begin video in ms):

```json
[{"code":"sq01","person":"p01","exercise":"squat","split":"test","assessable":true,"endsMs":[1500,3500,5500,7500,9500,11500,13500,15500],"heldSeconds":0,"tips":["depth"],"negativeWindowsMs":[[0,500]]}]
```

`tips` bevat uitsluitend herhaalde aandachtspunten uit het beoordeelde blok. Sleutels voor de pilot: `depth`, `hip-line`, `shoulder-stack`, `back-neutral`. Gebruik `assessable:false` bij onvoldoende zicht, en `endsMs:[]` bij een lege kamer of een hold. `negativeWindowsMs` markeert intervallen waarin de teller nul extra herhalingen mag registreren. Bewaar alle gedownloade rapporten en labels buiten Git.

```sh
npm run pilot:report -- /pad/labels.json /pad/rapporten/*.json
```

Het rapport toont per oefening en variant de absolute aantallen, ontbrekende sets, exacte telling, foutmarge, fantoomherhalingen en bevestigde/getoonde en gevonden/verwachte tips. Gebruik `fullSets`, `fullSetExactRate` en `fullMaxError` voor de vrijgavetest: een lege kamer of halve set mag de 90% niet opkrikken. Een ontbrekende noemer levert `null`, geen succes. Voor plank beoordeel je de houdfout, niet het aantal reps.

## Besluit

Vrijgave vereist op de eindtest minimaal 90% exact getelde sets (rest maximaal één ernaast), nul fantoomherhalingen in negatieve tests, minstens 90% bevestigde tips en 80% herkenning van zichtbare terugkerende aandachtspunten. Bij 20 s plank mag de afwijking hoogstens 2 s zijn. Inspecteer ook de aantallen onvolledige en onbeoordeelbare sets.

Test daarnaast tien minuten op laptop, iPhone/Safari en Android/Chrome: lenswissel, feitelijke zoom, pauzeren, tijdelijk afdekken en de zichtbare teller na voltooiing. Gebruik synchroon vastgelegde beweging en scherm voor voltooiing-tot-weergave (doel p95 ≤250 ms). De p95 op de meetpagina is uitsluitend **inferentietijd**, geen meting van deze gebruikersvertraging. Kies pas na deze proeven de lichtste voldoende betrouwbare optie. Een worker of geleerd telmodel is pas aan de orde als de metingen daar aanleiding toe geven.
