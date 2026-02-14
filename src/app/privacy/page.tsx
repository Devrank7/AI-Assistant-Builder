import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Политика конфиденциальности — WinBix AI',
  description: 'Политика конфиденциальности платформы WinBix AI',
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-12 mb-4 text-2xl font-bold text-white">{children}</h2>;
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-8 mb-3 text-lg font-semibold text-white">{children}</h3>;
}

export default function PrivacyPage() {
  return (
    <div className="bg-gradient-animated relative min-h-screen overflow-hidden">
      <div className="aurora" />
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-30" />

      {/* Navigation */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-5 md:px-12">
        <Link href="/" className="flex items-center gap-3 text-white transition-opacity hover:opacity-80">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--neon-cyan)] to-[var(--neon-purple)]">
            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-2.47 2.47a2.25 2.25 0 01-1.59.659H9.06a2.25 2.25 0 01-1.591-.659L5 14.5m14 0V6.5a2.25 2.25 0 00-2.25-2.25h-9.5A2.25 2.25 0 005 6.5v8"
              />
            </svg>
          </div>
          <span className="text-lg font-bold">WinBix AI</span>
        </Link>
        <Link
          href="/"
          className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-gray-300 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
        >
          На главную
        </Link>
      </nav>

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-3xl px-6 pt-8 pb-24">
        <h1 className="mb-2 text-4xl font-bold text-white md:text-5xl">
          Политика <span className="gradient-text">конфиденциальности</span>
        </h1>
        <p className="mb-8 text-sm text-gray-500">Последнее обновление: 14 февраля 2026 г.</p>

        <div className="space-y-4 text-base leading-relaxed text-gray-400">
          {/* 1 */}
          <SectionTitle>1. Общие положения</SectionTitle>
          <p>
            Настоящая Политика конфиденциальности описывает, как <span className="text-white">WinBix AI</span> (далее
            &mdash; &laquo;Компания&raquo;, &laquo;мы&raquo;, &laquo;нас&raquo;) собирает, использует, хранит и защищает
            персональные данные пользователей платформы <span className="text-white">winbix-ai.pp.ua</span> (далее
            &mdash; &laquo;Платформа&raquo;).
          </p>
          <p>
            Используя Платформу, вы подтверждаете, что ознакомились с данной Политикой и даёте согласие на обработку
            ваших данных в соответствии с ней.
          </p>
          <p>
            Платформа действует в соответствии с Законом Украины &laquo;О защите персональных данных&raquo; (от
            01.06.2010 No 2297-VI), Общим регламентом защиты данных Европейского Союза (GDPR) и другими применимыми
            нормативными актами.
          </p>

          {/* 2 */}
          <SectionTitle>2. Какие данные мы собираем</SectionTitle>

          <SubTitle>2.1. Данные аккаунта клиента</SubTitle>
          <p>При регистрации на Платформе в качестве клиента мы можем собирать:</p>
          <ul className="ml-6 list-disc space-y-1">
            <li>Название компании / имя пользователя</li>
            <li>Адрес электронной почты</li>
            <li>Номер телефона</li>
            <li>Адрес веб-сайта</li>
            <li>Физические адреса офисов / филиалов</li>
            <li>Аккаунты в социальных сетях (Instagram и др.)</li>
          </ul>

          <SubTitle>2.2. Данные чата (конечные пользователи виджета)</SubTitle>
          <p>Когда посетитель сайта клиента взаимодействует с AI-виджетом, мы собираем:</p>
          <ul className="ml-6 list-disc space-y-1">
            <li>Текст сообщений в чате</li>
            <li>Идентификатор сессии (генерируется автоматически)</li>
            <li>Временные метки сообщений</li>
            <li>Загруженные изображения (при отправке через виджет)</li>
          </ul>

          <SubTitle>2.3. Технические данные</SubTitle>
          <p>Автоматически собираемая техническая информация:</p>
          <ul className="ml-6 list-disc space-y-1">
            <li>IP-адрес</li>
            <li>User-Agent (тип браузера, операционная система, устройство)</li>
            <li>URL страницы, на которой установлен виджет</li>
            <li>Канал обращения (веб-сайт, Telegram, WhatsApp, Instagram)</li>
          </ul>

          <SubTitle>2.4. Данные лидов</SubTitle>
          <p>Если посетитель оставляет контактные данные через виджет, мы собираем:</p>
          <ul className="ml-6 list-disc space-y-1">
            <li>Имя</li>
            <li>Адрес электронной почты</li>
            <li>Номер телефона</li>
            <li>Дополнительная информация, указанная пользователем (тип услуги, предпочтительная дата и т.д.)</li>
          </ul>

          <SubTitle>2.5. Платёжные данные</SubTitle>
          <p>
            Мы <span className="text-white">не храним</span> данные платёжных карт. Оплата обрабатывается сторонними
            платёжными провайдерами (WayForPay, Cryptomus, NowPayments). Мы сохраняем только:
          </p>
          <ul className="ml-6 list-disc space-y-1">
            <li>Метод оплаты (название провайдера)</li>
            <li>Сумму и статус платежа</li>
            <li>Даты платежей</li>
            <li>Номер счёта-фактуры</li>
          </ul>

          <SubTitle>2.6. Аналитические данные</SubTitle>
          <p>Мы собираем агрегированную статистику использования:</p>
          <ul className="ml-6 list-disc space-y-1">
            <li>Количество обращений в чат</li>
            <li>Среднее количество сообщений за сессию</li>
            <li>Среднее время ответа AI</li>
            <li>Почасовое распределение активности</li>
            <li>Оценки ответов (положительные / отрицательные)</li>
          </ul>

          {/* 3 */}
          <SectionTitle>3. Файлы cookie и локальное хранилище</SectionTitle>

          <SubTitle>3.1. Файлы cookie</SubTitle>
          <p>Платформа использует следующие файлы cookie:</p>

          <div className="my-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-gray-300">
                  <th className="py-2 pr-4">Название</th>
                  <th className="py-2 pr-4">Тип</th>
                  <th className="py-2 pr-4">Срок</th>
                  <th className="py-2">Назначение</th>
                </tr>
              </thead>
              <tbody className="text-gray-400">
                <tr className="border-b border-white/5">
                  <td className="py-2 pr-4 font-mono text-xs text-white">admin_token</td>
                  <td className="py-2 pr-4">HttpOnly, Secure</td>
                  <td className="py-2 pr-4">7 дней</td>
                  <td className="py-2">Аутентификация администратора</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-2 pr-4 font-mono text-xs text-white">client_token</td>
                  <td className="py-2 pr-4">HttpOnly, Secure</td>
                  <td className="py-2 pr-4">30 дней</td>
                  <td className="py-2">Аутентификация клиента</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            Все cookie являются <span className="text-white">строго необходимыми</span> для работы сервиса
            (аутентификация). Мы не используем рекламные, маркетинговые или аналитические cookie третьих сторон.
          </p>

          <SubTitle>3.2. Локальное хранилище (localStorage)</SubTitle>
          <p>AI-виджет на сайте клиента использует localStorage браузера для:</p>
          <ul className="ml-6 list-disc space-y-1">
            <li>
              <span className="font-mono text-xs text-white">widget_messages_&#123;clientId&#125;</span> &mdash;
              сохранение истории чата для продолжения сессии
            </li>
            <li>
              <span className="font-mono text-xs text-white">widget_position_&#123;clientId&#125;</span> &mdash; позиция
              кнопки виджета на странице
            </li>
            <li>
              <span className="font-mono text-xs text-white">cookie_consent</span> &mdash; статус принятия cookies на
              данном сайте
            </li>
          </ul>
          <p>Данные localStorage хранятся только в браузере пользователя и не передаются на сервер.</p>

          {/* 4 */}
          <SectionTitle>4. Как мы используем данные</SectionTitle>
          <p>Мы используем собранные данные для следующих целей:</p>
          <ul className="ml-6 list-disc space-y-1">
            <li>Предоставление и поддержка сервиса AI-ассистента</li>
            <li>Обработка запросов пользователей и генерация ответов с помощью AI</li>
            <li>Управление аккаунтами клиентов и подписками</li>
            <li>Аналитика и улучшение качества ответов AI</li>
            <li>Обработка платежей и выставление счетов</li>
            <li>Техническая поддержка и обеспечение безопасности</li>
            <li>Соблюдение законодательных требований</li>
          </ul>

          {/* 5 */}
          <SectionTitle>5. Передача данных третьим сторонам</SectionTitle>
          <p>
            Мы передаём данные третьим сторонам исключительно для обеспечения работы сервиса. Мы не продаём и не
            передаём данные для рекламных целей.
          </p>

          <SubTitle>5.1. Google (Gemini API)</SubTitle>
          <p>
            Для генерации ответов AI мы передаём текст сообщений пользователя и контекст базы знаний в Google Gemini
            API. Google обрабатывает данные в соответствии со своей{' '}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--neon-cyan)] underline underline-offset-2"
            >
              Политикой конфиденциальности
            </a>
            .
          </p>

          <SubTitle>5.2. Google Sheets API</SubTitle>
          <p>По запросу клиента данные лидов могут экспортироваться в Google Таблицы через сервисный аккаунт Google.</p>

          <SubTitle>5.3. Мессенджеры</SubTitle>
          <p>
            При подключении каналов Telegram, WhatsApp или Instagram сообщения маршрутизируются через соответствующие
            API-интерфейсы этих платформ (Telegram Bot API, WhatsApp Business API / WHAPI, Instagram Messaging API).
          </p>

          <SubTitle>5.4. Платёжные провайдеры</SubTitle>
          <p>
            Для обработки платежей мы используем WayForPay, Cryptomus и NowPayments. При оплате мы передаём провайдеру
            email, номер телефона и сумму платежа. Данные банковских карт обрабатываются непосредственно платёжным
            провайдером и не проходят через наши серверы.
          </p>

          {/* 6 */}
          <SectionTitle>6. Сроки хранения данных</SectionTitle>
          <div className="my-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-gray-300">
                  <th className="py-2 pr-4">Тип данных</th>
                  <th className="py-2 pr-4">Срок хранения</th>
                  <th className="py-2">Удаление</th>
                </tr>
              </thead>
              <tbody className="text-gray-400">
                <tr className="border-b border-white/5">
                  <td className="py-2 pr-4">Cookie (аутентификация)</td>
                  <td className="py-2 pr-4">7&ndash;30 дней</td>
                  <td className="py-2">Автоматически</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-2 pr-4">Журнал аудита</td>
                  <td className="py-2 pr-4">90 дней</td>
                  <td className="py-2">Автоматически (TTL)</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-2 pr-4">История чатов</td>
                  <td className="py-2 pr-4">До удаления аккаунта</td>
                  <td className="py-2">По запросу или при удалении аккаунта</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-2 pr-4">Данные лидов</td>
                  <td className="py-2 pr-4">До удаления аккаунта</td>
                  <td className="py-2">По запросу клиента</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-2 pr-4">Данные аккаунта</td>
                  <td className="py-2 pr-4">До удаления аккаунта</td>
                  <td className="py-2">По запросу</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-2 pr-4">Счета и платежи</td>
                  <td className="py-2 pr-4">Согласно требованиям законодательства</td>
                  <td className="py-2">В установленные законом сроки</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 7 */}
          <SectionTitle>7. Ваши права</SectionTitle>
          <p>В соответствии с GDPR и законодательством Украины вы имеете право:</p>
          <ul className="ml-6 list-disc space-y-1">
            <li>
              <span className="text-white">Доступ</span> &mdash; запросить копию ваших персональных данных
            </li>
            <li>
              <span className="text-white">Исправление</span> &mdash; потребовать исправления неточных данных
            </li>
            <li>
              <span className="text-white">Удаление</span> &mdash; потребовать удаления ваших данных
            </li>
            <li>
              <span className="text-white">Переносимость</span> &mdash; получить данные в машиночитаемом формате
            </li>
            <li>
              <span className="text-white">Отзыв согласия</span> &mdash; отозвать согласие на обработку данных в любое
              время
            </li>
            <li>
              <span className="text-white">Ограничение обработки</span> &mdash; потребовать ограничения обработки при
              определённых условиях
            </li>
          </ul>
          <p>
            Для реализации своих прав свяжитесь с нами по адресу: <span className="text-white">privacy@winbix.ai</span>
          </p>

          {/* 8 */}
          <SectionTitle>8. Демо-страницы</SectionTitle>
          <p>
            Платформа предоставляет демонстрационные страницы, на которых веб-сайт потенциального клиента отображается в
            элементе iframe вместе с нашим AI-виджетом. Это делается исключительно в целях{' '}
            <span className="text-white">предварительного просмотра</span> того, как виджет будет выглядеть на сайте
            клиента.
          </p>
          <p>На демо-страницах:</p>
          <ul className="ml-6 list-disc space-y-1">
            <li>Мы не собираем дополнительные данные с отображаемого сайта</li>
            <li>Мы не модифицируем содержимое сайта клиента</li>
            <li>Используются только публично доступные данные</li>
            <li>Демо создаётся для ознакомительных целей и может быть удалено по запросу владельца сайта</li>
          </ul>

          {/* 9 */}
          <SectionTitle>9. Безопасность данных</SectionTitle>
          <p>Мы принимаем следующие меры для защиты ваших данных:</p>
          <ul className="ml-6 list-disc space-y-1">
            <li>
              Cookie установлены с флагами HttpOnly и Secure (недоступны для JavaScript, передаются только по HTTPS)
            </li>
            <li>Защита SameSite=Lax для предотвращения CSRF-атак</li>
            <li>Ограничение частоты запросов (rate limiting) для защиты от злоупотреблений</li>
            <li>Шифрование передачи данных (TLS/HTTPS)</li>
            <li>Серверная аутентификация для доступа к данным клиентов</li>
            <li>Журнал аудита всех критических действий</li>
          </ul>

          {/* 10 */}
          <SectionTitle>10. Изменения в политике</SectionTitle>
          <p>
            Мы оставляем за собой право обновлять данную Политику конфиденциальности. При внесении существенных
            изменений мы уведомим вас через Платформу или по электронной почте. Дата последнего обновления указана в
            начале документа.
          </p>

          {/* 11 */}
          <SectionTitle>11. Контактная информация</SectionTitle>
          <p>По вопросам, связанным с обработкой персональных данных, обращайтесь:</p>
          <ul className="ml-6 list-disc space-y-1">
            <li>
              Email: <span className="text-white">privacy@winbix.ai</span>
            </li>
            <li>
              Telegram: <span className="text-white">@winbix_ai</span>
            </li>
          </ul>
        </div>

        {/* Footer */}
        <div className="glow-line mt-16 mb-8 h-px" />
        <footer className="flex flex-col items-center justify-between gap-4 text-sm text-gray-600 md:flex-row">
          <p>&copy; {new Date().getFullYear()} WinBix AI. Все права защищены.</p>
          <div className="flex gap-6">
            <Link href="/terms" className="text-gray-500 transition-colors hover:text-gray-300">
              Условия использования
            </Link>
            <Link href="/" className="text-gray-500 transition-colors hover:text-gray-300">
              На главную
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
