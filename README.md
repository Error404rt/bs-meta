# BS META

> Актуальная аналитика **Brawl Stars** на сезон — тиры бойцов по режимам, живая
> ротация карт, всё в стилистике игры. Запускается прямо на телефоне через Termux.

<p align="center">
  <a href="#-возможности">Возможности</a> ·
  <a href="#-запуск-на-android-termux">Запуск (Termux)</a> ·
  <a href="#-запуск-на-пк">Запуск (ПК)</a> ·
  <a href="#-как-обновлять-тиры">Как обновлять</a>
</p>

---

## ✨ Возможности

- **Сетка из 105+ бойцов** в каноничной графике (пины-головы прямо из Brawl Stars).
- **Тиры S / A / B / C / D** прямо на пине — сразу видно, кого брать.
- **Карточка бойца по клику**: 1–5 ★ по каждому из 9 режимов
  (Gem Grab, Heist, Brawl Ball, Knockout, Bounty, Hot Zone, Solo SD, Duo SD, 5v5) и Best Build.
- **Живая ротация карт** — режимы и карты, которые сейчас в игре. Меняется автоматически.
- **Кнопка ОБНОВИТЬ** — без перезагрузки страницы подтягивает свежую ротацию.
- **Поиск и фильтры** — по имени, классу, режиму, плюс сортировка по топу меты.
- **Content Creator Boost: `Goshakotanov`** — в углу шапки.

## 🛠 Стек

Чистый HTML + CSS + JS, **без сборки и зависимостей**. Никакого npm install.

| Что | Откуда |
|---|---|
| Список бойцов и графика | [Brawlify API](https://brawlapi.com) |
| Активная ротация карт | Brawlapi `/v1/events` |
| Тиры по режимам | `data/meta.json` (правится вручную после балансных патчей) |

> **Важно:** Supercell официально публикует только изменения баланса (бафы/нерфы),
> а не готовые тир-листы. Поэтому `data/meta.json` — это редакторский файл,
> который обновляется после каждого балансного апдейта.

---

## 📱 Запуск на Android (Termux)

### 1. Подготовка (один раз)

Скачай **Termux** с F-Droid (версия из Google Play устарела и не работает):
🔗 https://f-droid.org/packages/com.termux/

Открой Termux и выполни:

```bash
pkg update -y && pkg upgrade -y
pkg install -y python git
```

### 2. Скачать проект (один раз)

```bash
cd ~
git clone https://github.com/Error404rt/bs-meta.git
cd bs-meta
```

### 3. Запустить (каждый раз)

```bash
cd ~/bs-meta
python -m http.server 8080
```

Termux напишет `Serving HTTP on 0.0.0.0 port 8080`.

Открой в любом мобильном браузере на этом же телефоне:

```
http://localhost:8080
```

Готово 🎉

### 4. Обновить до свежей версии

```bash
cd ~/bs-meta
git pull
```

### Алиас «запусти одной командой»

```bash
echo 'alias bs="cd ~/bs-meta && git pull && python -m http.server 8080"' >> ~/.bashrc
source ~/.bashrc
```

Теперь в Termux достаточно написать:

```bash
bs
```

### Хитрости Termux

| Действие | Команда |
|---|---|
| Остановить сервер | `Ctrl + C` (на клавиатуре Termux снизу) |
| Не давать телефону уснуть | `termux-wake-lock` |
| Снять | `termux-wake-unlock` |
| Узнать локальный IP (открыть с другого устройства в Wi-Fi) | `ifconfig` |

---

## 💻 Запуск на ПК

```bash
git clone https://github.com/Error404rt/bs-meta.git
cd bs-meta
python3 -m http.server 8080
```

Открой `http://localhost:8080`.

> Через `file://` **не сработает** — браузеру нельзя загружать `data/meta.json`
> локально без сервера.

---

## 🔧 Как обновлять тиры

Когда Supercell выкатывает балансный патч:

1. Открой блог: <https://supercell.com/en/games/brawlstars/blog/>
2. Открой `data/meta.json`.
3. Найди бойца и поправь `ratings` (значения 1–5):

```json
"16000005": {
  "name": "Spike",
  "ratings": {
    "gemGrab": 5,
    "heist": 3,
    "brawlBall": 4,
    "knockout": 4,
    "bounty": 4,
    "hotZone": 5,
    "soloShowdown": 4,
    "duoShowdown": 4,
    "fiveVsFive": 5
  }
}
```

4. `git commit -am "balance update"`, `git push`. На клиенте — кнопка **ОБНОВИТЬ**.

Среднее по 9 режимам определяет общий тир S/A/B/C/D на пине.

---

## 📁 Структура

```
bs-meta/
├── index.html      разметка
├── styles.css      стилистика Brawl Stars
├── app.js          логика: fetch + рендер + модалка
├── data/
│   └── meta.json   тиры по режимам (правится вручную)
├── .gitignore
├── LICENSE
└── README.md
```

---

## ⚠️ Известные нюансы

- В редкие моменты `api.brawlapi.com/v1/events` отдаёт пустой массив (между обновлениями цикла).
  Повторное нажатие **ОБНОВИТЬ** через минуту обычно решает.
- Тиры по умолчанию — отправная точка. Доводи под конкретный патч.

---

## 📄 Лицензия

MIT — делай что хочешь, ссылка приветствуется.
