# 🏭 Magazyn Manager

Aplikacja do zarządzania magazynem i planowania inwentury. Zbudowana na Next.js 14 + Supabase + Vercel.

---

## 📋 Funkcje (Etap 1)

| Zakładka | Opis |
|---|---|
| **Magazyn** | Podsumowanie inwentury — wszystkie towary, wagi per magazyn + suma |
| **Blaszak 1** | Siatka rzędów A-J, góra/dół, frakcja + waga, nawigacja klawiaturą |
| **Blaszak 2** | Jak Blaszak 1 |
| **Wiata** | Jak Blaszak 1 |
| **Mag. Lewa Strona** | Kwit wagowy + Skrobia % + Waga + Towar + Klient |
| **Mag. Prawa Strona** | Jak Lewa Strona |
| **Kontenery** | 6 kontenerów × 4 towary + klient + uwagi |
| **AMBRO** | Lista przyjęć/wydań + kwit + uwagi + saldo |

### Kluczowe funkcje
- ✅ Autosave (debounced 800ms) — zapis po każdej zmianie
- ✅ Nawigacja strzałkami i Tab między polami
- ✅ Druk każdej zakładki (`Ctrl+P` lub przycisk)
- ✅ Wybór daty — historia per dzień
- ✅ Logowanie (Supabase Auth)
- ✅ Podsumowanie wagowe (suma per kolumna + suma globalna)

---

## 🚀 Wdrożenie — krok po kroku

### Krok 1: Utwórz projekt Supabase

1. Wejdź na [supabase.com](https://supabase.com) → **New project**
2. Zapisz nazwę projektu, hasło do bazy
3. Po utworzeniu przejdź do **Settings → API**
4. Skopiuj:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Krok 2: Utwórz tabele w Supabase

1. W panelu Supabase otwórz **SQL Editor**
2. Wklej i uruchom całą zawartość pliku `supabase/schema.sql`
3. Sprawdź w **Table Editor** czy tabele się utworzyły:
   - `warehouse_entries`
   - `containers`
   - `ambro_entries`
   - `warehouse_snapshots`

### Krok 3: Dodaj użytkowników

1. W panelu Supabase otwórz **Authentication → Users**
2. Kliknij **Add user** → **Create new user**
3. Wpisz email i hasło dla każdego pracownika
4. Powtórz dla wszystkich użytkowników

### Krok 4: Wgraj kod na GitHub

```bash
# Utwórz repozytorium na github.com, potem:
git init
git add .
git commit -m "Initial commit - Magazyn Manager"
git branch -M main
git remote add origin https://github.com/TWOJ_LOGIN/NAZWA_REPO.git
git push -u origin main
```

### Krok 5: Wdróż na Vercel

1. Wejdź na [vercel.com](https://vercel.com) → **New Project**
2. Zaimportuj repozytorium z GitHub
3. W sekcji **Environment Variables** dodaj:
   ```
   NEXT_PUBLIC_SUPABASE_URL = https://TWOJ_PROJEKT.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = TWOJ_KLUCZ
   ```
4. Kliknij **Deploy**

Po ~2 minutach aplikacja będzie dostępna pod adresem `https://TWOJA-NAZWA.vercel.app`

---

## 💻 Lokalne uruchomienie (do testów)

```bash
# Zainstaluj zależności
npm install

# Utwórz plik z danymi Supabase
cp .env.local.example .env.local
# Edytuj .env.local i wpisz swoje dane

# Uruchom
npm run dev
# Otwórz http://localhost:3000
```

---

## ⌨️ Nawigacja klawiaturą (Blaszak / Wiata)

| Klawisz | Akcja |
|---|---|
| `Tab` | Następne pole (frakcja → kg → następna kolumna) |
| `Shift+Tab` | Poprzednie pole |
| `↑` / `↓` | Góra ↔ Dół (w tym samym miejscu) |
| `←` / `→` | Poprzednia / następna kolumna |
| `Enter` | Przełącz góra ↔ dół |

---

## 📁 Struktura projektu

```
src/
├── app/
│   ├── (app)/              ← Chronione strony (wymagają logowania)
│   │   ├── page.tsx         ← Podsumowanie / Inwentura
│   │   ├── blaszak-1/
│   │   ├── blaszak-2/
│   │   ├── wiata/
│   │   ├── magazyn-lewa/
│   │   ├── magazyn-prawa/
│   │   ├── kontenery/
│   │   └── ambro/
│   ├── login/
│   └── globals.css
├── components/
│   ├── Sidebar.tsx          ← Nawigacja boczna
│   ├── BlaszakGrid.tsx      ← Siatka dla Blaszak/Wiata
│   └── MagazynGrid.tsx      ← Siatka dla Magazyn L/P
├── lib/
│   ├── types.ts             ← Typy TypeScript + konfiguracja magazynów
│   └── supabase/
│       ├── client.ts
│       └── server.ts
└── middleware.ts            ← Ochrona tras (wymaga logowania)
```

---

## 🔧 Konfiguracja magazynów

Aby zmienić liczbę rzędów lub kolumn, edytuj `src/lib/types.ts`:

```typescript
export const WAREHOUSE_ROWS: Record<Warehouse, number> = {
  BLASZAK_1: 5,   // ← zmień tu
  BLASZAK_2: 8,
  WIATA: 10,
  MAG_LEWA: 12,
  MAG_PRAWA: 10,
};
```

---

## 📅 Etap 2 (planowany)

- [ ] Eksport do Excel/PDF
- [ ] Historia zmian (kto zmienił, kiedy)
- [ ] Kopiowanie danych z poprzedniego dnia
- [ ] Powiadomienia przy niskim stanie
- [ ] Wyszukiwarka towaru po wszystkich magazynach
