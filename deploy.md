# Как развернуть WinBix AI на своём сервере

Пошаговая инструкция. Даже если вы никогда не разворачивали сервер — просто следуйте шагам по порядку.

---

## Что вам понадобится

| Что                        | Зачем                                            | Где взять                                                                                               |
| -------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Сервер (VPS)               | Место, где будет жить приложение                 | [AWS](https://aws.amazon.com), [DigitalOcean](https://digitalocean.com), [Hetzner](https://hetzner.com) |
| Доменное имя               | Красивый адрес вместо IP (например `mysite.com`) | [Namecheap](https://namecheap.com), [GoDaddy](https://godaddy.com)                                      |
| Gemini API ключ            | ИИ, который отвечает в чате                      | [Google AI Studio](https://aistudio.google.com/apikey)                                                  |
| Telegram бот (опционально) | Уведомления владельцу бизнеса                    | [@BotFather](https://t.me/BotFather) в Telegram                                                         |

### Минимальные требования к серверу

- **ОС**: Ubuntu 22.04 или 24.04
- **RAM**: 4 ГБ (минимум), 8 ГБ (рекомендуется)
- **Диск**: 20 ГБ свободного места
- **CPU**: 2 ядра

---

## Шаг 1. Подключитесь к серверу

После покупки VPS вам дадут IP-адрес и пароль (или SSH-ключ).

Откройте терминал на своём компьютере и введите:

```bash
ssh root@ВАШ_IP_АДРЕС
```

Например: `ssh root@16.171.39.113`

Если спросит "Are you sure?" — напишите `yes` и нажмите Enter.

> **Windows?** Используйте [PuTTY](https://www.putty.org/) или Windows Terminal (встроен в Windows 11).

---

## Шаг 2. Обновите систему

Первым делом обновим всё, что есть на сервере:

```bash
sudo apt update && sudo apt upgrade -y
```

Подождите, пока закончится (1-3 минуты).

---

## Шаг 3. Установите Docker

Docker — это программа, которая запускает приложение в изолированном контейнере. Вам не нужно понимать, как это работает — просто установите.

```bash
# Скачиваем и устанавливаем Docker
curl -fsSL https://get.docker.com | sh

# Добавляем себя в группу Docker (чтобы не писать sudo каждый раз)
sudo usermod -aG docker $USER
```

**Важно!** После этого нужно выйти и зайти заново:

```bash
exit
ssh root@ВАШ_IP_АДРЕС
```

Проверьте, что Docker работает:

```bash
docker --version
docker compose version
```

Должно показать версии (например `Docker version 24.0.7` и `Docker Compose version v2.21.0`). Если ошибка — значит Docker не установился, попробуйте ещё раз.

---

## Шаг 4. Создайте пользователя (для безопасности)

Не стоит всё запускать от имени root. Создадим отдельного пользователя:

```bash
adduser ubuntu
usermod -aG sudo ubuntu
usermod -aG docker ubuntu
```

Придумайте пароль, когда спросит. Остальные поля (Full Name и т.д.) — просто нажимайте Enter.

Переключитесь на нового пользователя:

```bash
su - ubuntu
```

---

## Шаг 5. Скачайте проект

```bash
cd /home/ubuntu
git clone https://github.com/Devrank7/AI-Assistant-Builder.git winbixai
cd winbixai
```

> Если репозиторий приватный, вам понадобится токен доступа. Вместо ссылки выше используйте:
>
> ```
> git clone https://ВАШ_ТОКЕН@github.com/Devrank7/AI-Assistant-Builder.git winbixai
> ```
>
> Токен можно создать здесь: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token (выберите `repo` scope).

---

## Шаг 6. Настройте переменные окружения

Переменные окружения — это секретные настройки приложения (пароли, ключи API). Они хранятся в специальных файлах, которые **никогда** не загружаются в Git (чтобы ваши пароли не утекли).

### 6.1 Сгенерируйте секретные ключи

Сначала сгенерируем все нужные ключи. Запустите каждую команду и **запишите результат** (скопируйте куда-нибудь):

```bash
# Ключ шифрования (64 символа — цифры и буквы a-f)
echo "ENCRYPTION_KEY=$(openssl rand -hex 32)"

# JWT секреты (3 штуки)
echo "JWT_ACCESS_SECRET=$(openssl rand -base64 32)"
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 32)"
echo "JWT_SECRET=$(openssl rand -base64 32)"

# Токен администратора (запомните его — это ваш пароль в админку)
echo "ADMIN_SECRET_TOKEN=$(openssl rand -base64 24)"
```

### 6.2 Создайте файл `.env.local`

```bash
nano .env.local
```

Вставьте текст ниже. **Замените** все значения в угловых скобках `< >` на свои:

```env
# ═══════════════════════════════════════════════════════════
#  ОБЯЗАТЕЛЬНЫЕ НАСТРОЙКИ (без них приложение НЕ запустится)
# ═══════════════════════════════════════════════════════════

# Подключение к базе данных MongoDB
# Если используете Docker Compose (рекомендуется) — оставьте как есть:
MONGODB_URI=mongodb://mongo:27017/aiwidget

# Секретный токен администратора (ваш пароль для входа в админку)
# Вставьте результат команды openssl из шага 6.1
ADMIN_SECRET_TOKEN=<вставьте-сгенерированный-токен>

# Ключ Google Gemini API
# Получите бесплатно на: https://aistudio.google.com/apikey
GEMINI_API_KEY=<ваш-ключ-от-gemini>

# Адрес вашего сайта (замените на ваш домен с https)
NEXT_PUBLIC_BASE_URL=https://<ваш-домен>.com


# ═══════════════════════════════════════════════════════════
#  БЕЗОПАСНОСТЬ (обязательно для продакшена)
# ═══════════════════════════════════════════════════════════

# Ключ шифрования — ровно 64 символа (из шага 6.1)
ENCRYPTION_KEY=<вставьте-64-символьный-ключ>

# Секреты для авторизации пользователей (из шага 6.1)
JWT_ACCESS_SECRET=<вставьте-jwt-access>
JWT_REFRESH_SECRET=<вставьте-jwt-refresh>
JWT_SECRET=<вставьте-jwt-secret>


# ═══════════════════════════════════════════════════════════
#  ОПЦИОНАЛЬНЫЕ НАСТРОЙКИ (можно добавить позже)
# ═══════════════════════════════════════════════════════════

# ─── Telegram бот (уведомления для бизнеса) ───
# Создайте бота: откройте @BotFather в Telegram → /newbot
# TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
# TELEGRAM_BOT_USERNAME=MyBotName

# ─── Email (восстановление пароля, уведомления) ───
# Для Gmail: включите 2FA, затем создайте "Пароль приложения"
# https://myaccount.google.com/apppasswords
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your@gmail.com
# SMTP_PASS=xxxx-xxxx-xxxx-xxxx
# SMTP_FROM=noreply@ваш-домен.com

# ─── Stripe (приём платежей) ───
# STRIPE_SECRET_KEY=sk_live_...
# STRIPE_WEBHOOK_SECRET=whsec_...
```

Сохраните файл: нажмите `Ctrl+X`, потом `Y`, потом `Enter`.

### 6.3 Создайте файл `.env`

Docker Compose использует отдельный `.env` файл для сборки. Скопируем основные значения:

```bash
nano .env
```

Вставьте (те же значения, что в `.env.local`):

```env
MONGODB_URI=mongodb://mongo:27017/aiwidget
ADMIN_SECRET_TOKEN=<тот-же-токен-что-в-env-local>
GEMINI_API_KEY=<тот-же-ключ-что-в-env-local>
NEXT_PUBLIC_BASE_URL=https://<ваш-домен>.com
```

Сохраните: `Ctrl+X` → `Y` → `Enter`.

---

## Шаг 7. Добавьте swap-файл (если RAM меньше 8 ГБ)

Сборка приложения требует много памяти. Если у вас 4 ГБ RAM, **обязательно** добавьте swap:

```bash
# Создаём swap-файл (виртуальная память на диске)
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Чтобы swap сохранился после перезагрузки сервера:
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Проверьте командой `free -h` — должна появиться строка `Swap: 4.0Gi`.

---

## Шаг 8. Запустите приложение

Это главный момент! Одна команда запускает всё:

```bash
cd /home/ubuntu/winbixai
docker compose up -d --build
```

### Что происходит за кулисами:

1. Docker скачивает Node.js 20 и MongoDB 7
2. Устанавливает все зависимости проекта
3. Собирает приложение (компилирует TypeScript, оптимизирует код)
4. Устанавливает Chromium (для скриншотов сайтов)
5. Запускает приложение на порту 3000 и базу данных на порту 27017

**Первая сборка занимает 5-15 минут.** Последующие — быстрее (1-3 минуты).

### Как следить за процессом:

```bash
# Логи сборки и запуска в реальном времени:
docker compose logs -f

# Нажмите Ctrl+C чтобы выйти из логов (приложение НЕ остановится)
```

### Как понять, что всё заработало:

```bash
# Проверить статус контейнеров:
docker compose ps
```

Вы должны увидеть два контейнера со статусом `Up` и `(healthy)`:

```
NAME                STATUS
winbixai-app-1      Up 2 minutes (healthy)
winbixai-mongo-1    Up 3 minutes (healthy)
```

**Финальная проверка:**

```bash
curl http://localhost:3000/api/health
```

Если вернёт что-то вроде `{"status":"healthy",...}` — приложение работает!

---

## Шаг 9. Настройте домен и HTTPS

Сейчас приложение доступно только по IP:3000. Давайте сделаем красиво — с доменом и HTTPS (замочек в браузере).

### 9.1 Направьте домен на сервер

Зайдите в панель управления DNS вашего регистратора (там, где покупали домен) и добавьте записи:

| Тип записи | Имя (Name) | Значение (Value) |
| ---------- | ---------- | ---------------- |
| A          | @          | ВАШ*IP*АДРЕС     |
| A          | www        | ВАШ*IP*АДРЕС     |

> `@` означает корневой домен (например `mysite.com`), а `www` — это `www.mysite.com`.

Подождите 5-30 минут, пока DNS обновится по всему миру.

**Проверить:** `ping ваш-домен.com` — должен показать ваш IP.

### 9.2 Установите Nginx

Nginx — это программа, которая принимает запросы из интернета и перенаправляет их в ваше приложение.

```bash
sudo apt install nginx -y
```

### 9.3 Создайте конфигурацию Nginx

```bash
sudo nano /etc/nginx/sites-available/winbixai
```

Вставьте текст ниже, **заменив** `ваш-домен.com` на свой домен:

```nginx
server {
    listen 80;
    server_name ваш-домен.com www.ваш-домен.com;

    # Максимальный размер загружаемых файлов (50 МБ)
    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Таймаут на 2 минуты (для долгих AI-запросов)
        proxy_read_timeout 120s;
    }
}
```

Сохраните: `Ctrl+X` → `Y` → `Enter`.

### 9.4 Активируйте конфигурацию

```bash
# Создаём символическую ссылку (включаем наш сайт)
sudo ln -s /etc/nginx/sites-available/winbixai /etc/nginx/sites-enabled/

# Удаляем дефолтную страницу Nginx ("Welcome to nginx!")
sudo rm -f /etc/nginx/sites-enabled/default

# Проверяем, что конфигурация написана правильно
sudo nginx -t
```

Если видите `syntax is ok` и `test is successful` — всё хорошо. Если ошибка — проверьте, что правильно написали домен.

```bash
# Перезапускаем Nginx
sudo systemctl restart nginx
```

### 9.5 Установите SSL-сертификат (HTTPS)

HTTPS — это шифрование трафика. Без него браузер покажет "Не безопасно", а некоторые функции (микрофон, геолокация) вообще не будут работать.

```bash
# Устанавливаем Certbot (бесплатные SSL-сертификаты от Let's Encrypt)
sudo apt install certbot python3-certbot-nginx -y

# Получаем и устанавливаем сертификат (замените домен!)
sudo certbot --nginx -d ваш-домен.com -d www.ваш-домен.com
```

Certbot спросит:

1. **Email** — введите свой (для уведомлений об истечении сертификата)
2. **Terms of Service** — введите `Y` (согласие)
3. **Redirect HTTP to HTTPS** — выберите `2` (рекомендуется)

**Готово!** Сертификат обновляется автоматически каждые 90 дней (Certbot добавит задачу в cron).

---

## Шаг 10. Проверьте, что всё работает

Откройте браузер и проверьте:

| Адрес                              | Что должно быть                  |
| ---------------------------------- | -------------------------------- |
| `https://ваш-домен.com`            | Главная страница WinBix AI       |
| `https://ваш-домен.com/admin`      | Страница входа в админку         |
| `https://ваш-домен.com/api/health` | JSON: `{"status":"healthy",...}` |

**Вход в админку:**

- Логин: `admin`
- Пароль: значение `ADMIN_SECRET_TOKEN` из файла `.env.local`

---

## Поздравляем! Приложение развёрнуто!

Теперь у вас работает полноценная AI-платформа с виджетами чата.

---

## Повседневные операции

### Как обновить приложение

Когда выйдет новая версия кода:

```bash
cd /home/ubuntu/winbixai

# 1. Скачать обновления
git pull origin main

# 2. Пересобрать и перезапустить (2-5 минут)
docker compose up -d --build

# 3. Проверить, что всё работает
docker compose ps
curl http://localhost:3000/api/health
```

### Как остановить приложение

```bash
# Остановить (данные НЕ удаляются):
docker compose down

# Запустить заново:
docker compose up -d

# Перезапустить (остановить + запустить):
docker compose restart
```

### Как посмотреть логи

```bash
# Все логи в реальном времени:
docker compose logs -f

# Только логи приложения (без MongoDB):
docker compose logs -f app

# Последние 100 строк логов:
docker compose logs --tail=100 app
```

### Как сделать бэкап базы данных

```bash
# Создать бэкап:
docker compose exec mongo mongodump --archive=/tmp/backup.gz --gzip
docker compose cp mongo:/tmp/backup.gz ./backup-$(date +%Y%m%d).gz

# Восстановить из бэкапа:
docker compose cp ./backup-20240101.gz mongo:/tmp/backup.gz
docker compose exec mongo mongorestore --archive=/tmp/backup.gz --gzip --drop
```

### Как посмотреть потребление ресурсов

```bash
# CPU и память контейнеров:
docker stats

# Место на диске:
df -h

# Очистить неиспользуемые Docker образы (освободить место):
docker system prune -a -f
```

---

## Настройка интеграций (опционально)

Эти настройки не обязательны для запуска, но добавляют полезные возможности.

### Telegram бот (уведомления)

Telegram бот отправляет уведомления владельцу бизнеса, когда клиент оставляет заявку в чате.

1. Откройте Telegram и найдите [@BotFather](https://t.me/BotFather)
2. Отправьте `/newbot`
3. Придумайте имя (например: "MyBusiness Notifications")
4. Придумайте username (например: `mybusiness_notify_bot`)
5. BotFather пришлёт вам **токен** — длинная строка вида `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`
6. Добавьте в `.env.local`:
   ```
   TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
   TELEGRAM_BOT_USERNAME=mybusiness_notify_bot
   ```
7. Установите webhook (чтобы бот получал сообщения):
   ```bash
   curl "https://api.telegram.org/bot<ВАШ_ТОКЕН>/setWebhook?url=https://<ваш-домен>.com/api/webhooks/telegram"
   ```
8. Перезапустите приложение: `docker compose up -d --build`

### Google Sheets (массовая работа с лидами)

Google Sheets позволяет загружать лиды из таблицы и автоматически создавать для них виджеты.

1. Зайдите на [Google Cloud Console](https://console.cloud.google.com)
2. Создайте новый проект (или выберите существующий)
3. Включите **Google Sheets API**: APIs & Services → Enable APIs → найдите "Google Sheets API" → Enable
4. Создайте сервисный аккаунт: APIs & Services → Credentials → Create Credentials → Service Account
5. Создайте ключ: нажмите на аккаунт → Keys → Add Key → Create new key → JSON
6. Скачается файл — загрузите его на сервер:
   ```bash
   # С вашего компьютера:
   scp ~/Downloads/ваш-файл.json ubuntu@ВАШ_IP:/home/ubuntu/winbixai/service_account.json
   ```
7. Откройте нужную Google-таблицу → нажмите "Поделиться" → добавьте email из поля `client_email` в JSON-файле
8. Перезапустите: `docker compose up -d --build`

### Stripe (приём платежей)

1. Зарегистрируйтесь на [stripe.com](https://stripe.com)
2. Перейдите в Developers → API Keys
3. Скопируйте Secret Key (`sk_live_...` для продакшена или `sk_test_...` для тестов)
4. Создайте Webhook: Developers → Webhooks → Add endpoint
   - URL: `https://ваш-домен.com/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted`
5. Скопируйте Webhook Secret (`whsec_...`)
6. Добавьте в `.env.local`:
   ```
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```
7. Перезапустите: `docker compose up -d --build`

---

## Альтернативный способ запуска: без Docker (PM2)

Если вы не хотите использовать Docker (например, на очень маленьком сервере), можно запустить приложение напрямую.

### 1. Установите Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Должно показать v20.x.x
```

### 2. Установите MongoDB 7

```bash
# Добавляем ключ и репозиторий MongoDB
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
  sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] \
  https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Устанавливаем и запускаем
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod  # автозапуск после перезагрузки
```

### 3. Установите PM2 и Chromium

```bash
sudo npm install -g pm2
sudo apt install -y chromium-browser
```

### 4. Настройте `.env.local`

В `.env.local` измените строку подключения к БД на локальную:

```
MONGODB_URI=mongodb://localhost:27017/aiwidget
```

(вместо `mongodb://mongo:27017/aiwidget`)

### 5. Соберите и запустите

```bash
cd /home/ubuntu/winbixai

# Установите зависимости
npm ci

# Соберите приложение (4 ГБ памяти для Node.js)
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# Установите зависимости сборщика виджетов
cd .claude/widget-builder && npm ci --include=dev && cd ../..

# Запустите через PM2
pm2 start npm --name "winbixai" -- start

# Сохраните конфигурацию (чтобы PM2 запускал приложение после перезагрузки)
pm2 save
pm2 startup  # Следуйте инструкции, которую покажет команда
```

### 6. Обновление при использовании PM2

```bash
cd /home/ubuntu/winbixai
git pull origin main
npm ci
NODE_OPTIONS="--max-old-space-size=4096" npm run build
pm2 restart winbixai
```

---

## Частые проблемы и решения

### Сборка падает с ошибкой "out of memory" или "Killed"

**Причина:** Мало оперативной памяти.

**Решение:** Добавьте swap (см. Шаг 7) и попробуйте заново:

```bash
docker compose down
docker builder prune -a -f
docker compose up -d --build
```

### Сборка падает с "failed to calculate checksum"

**Причина:** Испорченный кэш Docker.

**Решение:**

```bash
docker builder prune -a -f
docker compose up -d --build
```

### Приложение не запускается — ошибки про переменные

**Причина:** Не все обязательные переменные заполнены в `.env.local`.

**Проверка:**

```bash
# Все 4 строки должны иметь значения:
grep -E "^(MONGODB_URI|ADMIN_SECRET_TOKEN|GEMINI_API_KEY|NEXT_PUBLIC_BASE_URL)=" .env.local
```

### Сайт показывает "502 Bad Gateway"

**Причина:** Приложение ещё не запустилось или упало.

**Решение:**

```bash
# 1. Проверьте статус контейнеров:
docker compose ps

# 2. Если контейнер app не "healthy" — посмотрите логи:
docker compose logs --tail=50 app
```

Обычно причина — ошибка в переменных окружения или MongoDB не доступна.

### ИИ не отвечает в чате виджета

**Причина:** Неверный или истёкший ключ Gemini API.

**Проверка:**

```bash
# Замените YOUR_KEY на значение GEMINI_API_KEY из .env.local:
curl "https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_KEY" 2>/dev/null | head -5
```

Если ошибка — получите новый ключ на [aistudio.google.com/apikey](https://aistudio.google.com/apikey).

### Telegram бот не отправляет уведомления

**Проверьте:**

1. Токен бота верный: `grep TELEGRAM_BOT_TOKEN .env.local`
2. Webhook установлен:
   ```bash
   curl "https://api.telegram.org/bot<ТОКЕН>/getWebhookInfo"
   ```
3. Пользователь написал боту хотя бы одно сообщение (бот не может писать первым)

### Мало места на диске

```bash
# Посмотреть свободное место:
df -h

# Очистить всё ненужное в Docker:
docker system prune -a -f

# Удалить старые логи:
docker compose logs --tail=0
```

### Как увеличить мощность сервера (AWS)

1. Остановите сервер: AWS Console → EC2 → Instance → Stop
2. Actions → Instance Settings → Change Instance Type
3. Выберите побольше (например `t3.medium` = 4 ГБ RAM)
4. Запустите: Instance → Start

> **Внимание:** IP-адрес может измениться! Используйте Elastic IP (бесплатно, пока привязан к работающему серверу), чтобы IP оставался постоянным.

---

## Автоматический деплой через GitHub Actions (для продвинутых)

Если вы хотите, чтобы приложение обновлялось автоматически при каждом push в main:

### 1. Настройте SSH-ключ для GitHub

На своём компьютере:

```bash
# Генерируем ключ
ssh-keygen -t ed25519 -f github_deploy_key -N ""

# Копируем публичный ключ на сервер
ssh-copy-id -i github_deploy_key.pub ubuntu@ВАШ_IP
```

### 2. Добавьте секреты в GitHub

GitHub → ваш репозиторий → Settings → Secrets and variables → Actions:

| Секрет           | Значение                                              |
| ---------------- | ----------------------------------------------------- |
| `SERVER_HOST`    | IP-адрес сервера                                      |
| `SERVER_USER`    | `ubuntu`                                              |
| `SERVER_SSH_KEY` | Содержимое файла `github_deploy_key` (приватный ключ) |

### 3. Создайте workflow

Создайте файл `.github/workflows/deploy.yml`:

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to server
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: |
            cd /home/ubuntu/winbixai
            git pull origin main
            docker compose up -d --build
            docker image prune -f
```

Теперь каждый `git push` в main автоматически обновит сервер.

---

## Быстрая памятка (шпаргалка)

| Что сделать    | Команда                                                                                                           |
| -------------- | ----------------------------------------------------------------------------------------------------------------- |
| Запустить      | `docker compose up -d`                                                                                            |
| Остановить     | `docker compose down`                                                                                             |
| Пересобрать    | `docker compose up -d --build`                                                                                    |
| Перезапустить  | `docker compose restart`                                                                                          |
| Логи           | `docker compose logs -f app`                                                                                      |
| Статус         | `docker compose ps`                                                                                               |
| Здоровье       | `curl localhost:3000/api/health`                                                                                  |
| Обновить       | `git pull && docker compose up -d --build`                                                                        |
| Бэкап БД       | `docker compose exec mongo mongodump --archive=/tmp/b.gz --gzip && docker compose cp mongo:/tmp/b.gz ./backup.gz` |
| Очистить кэш   | `docker builder prune -a -f`                                                                                      |
| Место на диске | `df -h`                                                                                                           |
| Ресурсы        | `docker stats`                                                                                                    |

---

## Структура проекта (для любопытных)

```
winbixai/
├── src/                        # Исходный код (Next.js + TypeScript)
│   ├── app/                    # Страницы и API
│   │   ├── api/                # Серверные API-маршруты
│   │   │   ├── chat/           # Чат с ИИ (streaming)
│   │   │   ├── webhooks/       # Вебхуки (Telegram, WhatsApp, Stripe)
│   │   │   ├── clients/        # Управление клиентами
│   │   │   └── knowledge/      # База знаний
│   │   ├── admin/              # Панель администратора
│   │   ├── dashboard/          # Личный кабинет пользователя
│   │   └── demo/               # Демо-страницы виджетов
│   ├── lib/                    # Бизнес-логика
│   │   ├── builder/            # AI-билдер виджетов
│   │   ├── integrations/       # Интеграции (Telegram, Sheets и др.)
│   │   └── mongodb.ts          # Подключение к базе данных
│   └── components/             # React-компоненты интерфейса
├── widgets/                    # Готовые виджеты клиентов (продакшен)
├── quickwidgets/               # Демо-виджеты
├── knowledge-seeds/            # Базы знаний в JSON (для Docker)
├── .claude/widget-builder/     # Сборщик виджетов (Preact + Vite)
├── docker-compose.yml          # Конфигурация Docker
├── Dockerfile                  # Инструкция сборки контейнера
├── .env.local                  # Секретные настройки (НЕ в Git!)
├── .env                        # Переменные сборки (НЕ в Git!)
└── service_account.json        # Google API ключ (НЕ в Git!)
```

---

_Если что-то не работает — первым делом смотрите логи: `docker compose logs -f app`. В 90% случаев ответ будет там._
