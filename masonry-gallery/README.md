# Masonry Gallery WordPress Theme - Dokumentation

## Skapat av: OpenCode (lapo70/opencode-masterclass)

## Filstruktur

```
masonry-gallery/
├── style.css              # Tema-header
├── functions.php          # Setup, hjälpfunktioner
├── index.php              # Standardmall
├── header.php             # Sidhuvud med navigering
├── footer.php             # Sidfot
├── page-gallery.php       # Huvudmallen (masonry-galleri)
├── assets/
│   ├── css/masonry.css    # Masonry + lightbox-styling
│   └── js/masonry.js      # Lightbox med bläddring
```

## Installation på WordPress

### Alternativ 1: Kopiera via SCP (till egen server)
```powershell
scp -r "C:\Users\pavpl553\Documents\opencode-masterclass\masonry-gallery" användare@server:/var/www/html/wp-content/themes/
```

### Alternativ 2: Packa som zip och ladda upp via WordPress admin
Zippa `masonry-gallery/` och ladda upp via Utseende → Teman → Lägg till nytt

### Efter installation
1. Aktivera temat (Utseende → Teman)
2. Skapa en ny sida → välj mall "Masonry Gallery" → publicera
3. Skapa bildmappar via FTP i `wp-content/uploads/gallery/`

## Bildmappar

Lägg dina bilder organiserade i undermappar:

```
wp-content/uploads/gallery/
├── Domherre/       (lägg bilder här)
├── Blåhake/        (lägg bilder här)
├── Talgoxe/        (lägg bilder här)
└── ...valfritt mappnamn...
```

Stödda filformat: jpg, jpeg, png, gif, webp, avif

## Felsökning

### "Inga bilder hittades" eller $1 visas som mappnamn
Rewrite-regler har inte spolats:
- WordPress admin → Inställningar → Permalänkar → Spara ändringar
- Eller avaktivera/återaktivera temat

### Databasfel "Could not insert post into the database"
Diskutrymmet är slut på servern:
```bash
df -h                     # Kolla ledigt utrymme
sudo apt clean            # Rensa apt-cache
sudo apt autoremove       # Ta bort gamla paket
sudo journalctl --vacuum-size=500M  # Rensa loggar
```

### Å, ä, ö fungerar inte i mappnamn
Har åtgärdats — mappnamn valideras mot faktiska mappar.

## Uppdatera filer på servern (enskilda filer)

```powershell
scp "sökväg\till\fil.php" användare@server:/var/www/html/wp-content/themes/masonry-gallery/
```

## Pusha ändringar till GitHub

```bash
cd "C:\Users\pavpl553\Documents\opencode-masterclass"
git add masonry-gallery/
git commit -m "Lägg till WordPress-tema med masonry-galleri"
git push
```

## Funktioner i temat

- **Förstasida**: Visar alla mappar som klickbara kort (20 per sida med paginering)
- **Slumpad bild**: Varje mapp representeras av en slumpmässig bild
- **Masonry-layout**: Bilderna visas i ett flytande rutnät
- **Undermappsida**: Klicka på en mapp för att se alla bilder
- **Ljusbildsfunktion**: Klicka på en bild för att visa i fullstorlek
- **Bläddring i ljusbild**: Pilknappar, klicka på bilden eller tangentbordspilar (vänster/höger)
- **Navigering**: Föregående/nästa mapp-knappar, "Alla album" för att gå tillbaka
