# PADEL KLATOVY — Klubový kalendář (v2)

Mobilní klubová nástěnka akcí ve stylu skutečné značky Padel Klatovy
(červená, zelená, bílá, černá — barvy vytažené přímo z klubového loga).
Navazuje na stejný vizuální jazyk jako BAR appka a Hub (tmavý dashboard,
zaoblené karty), ale barevně přesně sedí k logu a webu padelklatovy.cz.

## Co je nového oproti první verzi

- Skutečné barvy z loga (`#FF0000` červená, `#00534E` zelená), logo přímo v hlavičce
- 8 kategorií s emoji, přesně podle zadání (Turnaj, Komunita, Přednáška/Workshop, Trénink, Open Match, Zdravý hráč, Firemní akce, Klubový život)
- Vyhledávání ("Hledat akci…"), necitlivé na diakritiku
- Barevné štítky (štítky "zdarma"/"veřejné" zeleně, "registrace nutná"/"kapacita omezená" červeně, ostatní neutrálně)
- Kapacita s ukazatelem obsazenosti (X/Y přihlášeno)
- 5 stavů akce včetně "Poslední místa" a "Proběhlo" (proběhlé akce mají vlastní skládací sekci dole)
- Detail akce: fotka (nebo hezký placeholder), harmonogram jako časová osa, co s sebou, štítky, odkaz na mapu areálu
- Kontakty a odkaz na mapu předvyplněné podle padelklatovy.cz (tel. +420 602 431 363, info@padelklatovy.cz)

## Soubory

```
index.html        veřejný kalendář
admin.html         administrace chráněná heslem
style.css / admin.css   vzhled
config.js          NASTAVENÍ (kontakty, heslo, Supabase)
sample-data.js      ukázkové akce — jedna pro každou kategorii + zrušená a proběhlá
data-service.js     přepínání demo/localStorage ↔ Supabase
app.js / admin.js    logika veřejné části a administrace
schema.sql          SQL pro tabulku "events" v Supabase
assets/logo.png      klubové logo (použité v hlavičce)
```

## 1. Rychlé vyzkoušení

Otevři `index.html` v prohlížeči — poběží v DEMO režimu s 10 ukázkovými
akcemi. `admin.html` → heslo je v `config.js` (`ADMIN_PASSWORD`), změny
se v demu ukládají do localStorage prohlížeče.

## 2. Než nasadíš ostro

V `config.js` zkontroluj/uprav:
- `WHATSAPP_NUMBER` — výchozí je klubové číslo z webu, uprav pokud chceš jiné
- `ADMIN_PASSWORD` — nastav vlastní heslo
- `MAP_URL` — už ukazuje na mapy.cz na váš areál (stejný odkaz jako na webu)

## 3. Napojení na Supabase (doporučeno)

1. V Supabase spusť `schema.sql` (SQL Editor → New query).
2. Zkopíruj `Project URL` a `anon public` klíč z Project Settings → API.
3. Vlož do `config.js`:
   ```js
   SUPABASE_URL: "https://tvuj-projekt.supabase.co",
   SUPABASE_ANON_KEY: "tvuj-anon-klic",
   ```
4. Obnov stránku — aplikace přestane používat demo data a začne
   používat Supabase. Ukázkové akce se tam samy nenahrají, zadej si
   pár skutečných přes administraci.

**Tip:** klidně použij stejný Supabase projekt jako u Hubu/BAR appky
(`zlgqsndoreimophthvpw`) — tabulka `events` nijak nekoliduje s
ostatními tabulkami. Usnadní to případné budoucí propojení (např. Hub
by mohl zobrazovat nejbližší akci na kartě).

**Bezpečnost administrace:** heslo se ověřuje jen v prohlížeči — pro
klubový provoz v pořádku, ale nechrání to zápis do databáze před
technicky zdatným návštěvníkem se znalostí anon klíče. `schema.sql`
obsahuje na konci zakomentovaný postup, jak to později zpevnit přes
Supabase Auth.

## 4. Jak přidat/upravit akci

- **Fotografie**: vlož URL obrázku (např. z Google Drive/Facebook
  albumu s veřejným odkazem). Necháš-li pole prázdné, karta i detail
  zobrazí barevný placeholder s ikonou kategorie — vypadá to
  úmyslně, ne rozbitě.
- **Štítky**: piš oddělené čárkou, např. `zdarma, pro členy, grilování`.
  Našeptávač nabízí i doporučenou sadu (zdarma, pro členy, veřejné,
  začátečníci, pokročilí, ženy, registrace nutná, kapacita omezená,
  grilování, občerstvení, LED obrazovka, CUPRA, Red Bull) — klidně
  přidej i vlastní.
- **Harmonogram**: jeden řádek = jedna položka, formát `ČAS - POPIS`,
  např. `09:00 - Registrace`. Zobrazí se jako časová osa v detailu.
- **Duplikovat** starší akci rovnou otevře její kopii k úpravě — hodí
  se na pravidelné akce (turnaje, tréninky).
- **Označit proběhlé** přesune akci do skládací sekce "Proběhlé akce"
  dole na stránce, mimo hlavní přehled.

## 5. Nasazení na GitHub Pages

Stejně jako u BAR appky/Hubu: nahraj složku do repozitáře, v
**Settings → Pages** nastav větev `main` a `/ (root)`. Appka poběží na
`https://<tvuj-github>.github.io/<repo>/`.

## 6. Open Match je živě propojený s „Chybí nám hráč"

Kategorie **Open Match** se v kalendáři automaticky plní z živých dat appky
[Chybí nám hráč](https://padelklatovy.github.io/chybi-nam-hrac/) — ze
stejné Supabase tabulky `matches`, co appka sama používá. Kalendář z ní
**jen čte** (soubor `openmatch-service.js`), nic tam nezapisuje a appku
nijak neovlivňuje.

- Karty Open Match v kalendáři se generují automaticky — nezadávají se
  ručně v administraci (kategorie tam sice zůstává, ale jen jako
  záložní/testovací možnost, kdyby živá data zrovna nešla načíst).
- Tlačítko na kartě/detailu vede přímo do „Chybí nám hráč" — tam se
  člen skutečně přidá nebo hru založí. Kalendář jen ukazuje přehled.
- Pokud se živá data nepodaří načíst (výpadek, CORS…), appka to potichu
  přejde a nechá, co už v kategorii Open Match má (v demu je to ukázková
  akce ze `sample-data.js`).
- Přihlašovací údaje k projektu „Chybí nám hráč" jsou v `config.js` pod
  `CHYBI_NAM_HRAC_*` — jsou to veřejné (anon) klíče určené pro čtení do
  frontendu, stejné jako v appce samotné, není třeba je měnit.

V `config.js` je také `BAR_APP_URL` a `ZDRAVY_HRAC_APP_URL` — pod
seznamem akcí se z nich vykreslí rychlé odkazy na sesterské appky.
Obě adresy jsou už vyplněné (Bar i Zdravý hráč PRO). Pokud se Zdravý
hráč PRO někdy přestěhuje na `zdravyhrac.padelon.cz`, stačí tu jednu
hodnotu přepsat.

## 7. Architektura připravená na budoucí rozvoj

Podle zadání appka *zatím* neřeší tyto věci, ale struktura na ně
záměrně myslí:

- **Paysy** — pole `location` a `capacity` jsou oddělená od
  rezervačního systému; až bude Paysy API, dá se kapacita/obsazenost
  dotahovat automaticky místo ručního zadávání `signed_up_count`.
- **BAR appka / Hub** — stejný Supabase projekt, žádná kolize tabulek.
- **Open Match** — kategorie `open_match` je připravená, samotné
  přihlašování zatím jede přes WhatsApp stejně jako ostatní kategorie;
  až bude vlastní Open Match modul hotový, dá se na něj z detailu akce
  jen prolinkovat.
- **Push notifikace** — `data-service.js` je jediné místo, kudy
  všechna data putují, takže se sem dá později přidat volání na
  push (např. při vytvoření akce se stavem "Otevřeno").
- **Klubové novinky / galerie / věrnostní systém / členská sekce /
  online registrace** — žádné z těchto polí kalendář nezabírá ani
  nekoliduje s existujícím datovým modelem Hubu, takže se dají stavět
  nezávisle a později propojit (např. věrnostní body za účast na akci).

## 8. Co appka záměrně (zatím) nedělá

- Nenahrazuje rezervace kurtů přes Paysy.
- Přihlašování je jen přes předvyplněnou WhatsApp zprávu, ne přes
  formulář s uložením do databáze.
- Nemá push notifikace, vlastní galerii ani věrnostní body — viz
  bod 6 výše, architektura na to ale myslí.
