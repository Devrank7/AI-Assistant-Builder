'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/i18n/context';
import { useTranslation } from '@/i18n/useTranslation';
import LanguageSwitcher from '@/components/LanguageSwitcher';

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-12 mb-4 text-2xl font-bold text-white">{children}</h2>;
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-8 mb-3 text-lg font-semibold text-white">{children}</h3>;
}

/* ─────────────────────────── RUSSIAN ─────────────────────────── */

function RuContent() {
  return (
    <>
      <SectionTitle>1. Общие положения</SectionTitle>
      <p>
        Настоящая Политика конфиденциальности описывает, как WinBix AI (далее — «Компания», «мы», «нас») собирает,
        использует, хранит и защищает персональные данные пользователей платформы winbix-ai.xyz (далее — «Платформа»).
      </p>
      <p>
        Используя Платформу, вы подтверждаете, что ознакомились с настоящей Политикой и даёте согласие на обработку
        ваших данных в соответствии с ней.
      </p>
      <p>
        Платформа действует в соответствии с Законом Украины «О защите персональных данных» (от 01.06.2010 № 2297-VI),
        Общим регламентом защиты данных Европейского Союза (GDPR) и другими применимыми нормативными актами.
      </p>

      <SectionTitle>2. Какие данные мы собираем</SectionTitle>

      <SubTitle>2.1 Данные аккаунта клиента</SubTitle>
      <p>При регистрации на Платформе в качестве клиента мы можем собирать:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>Название компании / имя пользователя</li>
        <li>Адрес электронной почты</li>
        <li>Номер телефона</li>
        <li>Адрес веб-сайта</li>
        <li>Физические адреса офисов / филиалов</li>
        <li>Аккаунты в социальных сетях (Instagram и др.)</li>
      </ul>

      <SubTitle>2.2 Данные чата (конечные пользователи виджета)</SubTitle>
      <p>Когда посетитель сайта клиента взаимодействует с AI-виджетом, мы собираем:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>Текст сообщений чата</li>
        <li>Идентификатор сессии (генерируется автоматически)</li>
        <li>Временные метки сообщений</li>
        <li>Загруженные изображения (при отправке через виджет)</li>
      </ul>

      <SubTitle>2.3 Технические данные</SubTitle>
      <p>Автоматически собираемая техническая информация:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>IP-адрес</li>
        <li>User-Agent (тип браузера, операционная система, устройство)</li>
        <li>URL страницы, на которой установлен виджет</li>
        <li>Канал связи (веб-сайт, Telegram, WhatsApp, Instagram)</li>
      </ul>

      <SubTitle>2.4 Данные лидов</SubTitle>
      <p>Если посетитель оставляет контактные данные через виджет:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>Имя</li>
        <li>Адрес электронной почты</li>
        <li>Номер телефона</li>
        <li>Дополнительная информация, предоставленная пользователем (тип услуги, предпочтительная дата и т.д.)</li>
      </ul>

      <SubTitle>2.5 Платёжные данные</SubTitle>
      <p>
        Мы не храним данные платёжных карт. Оплата обрабатывается сторонними платёжными провайдерами (WayForPay,
        Cryptomus, NowPayments). Мы сохраняем только:
      </p>
      <ul className="ml-6 list-disc space-y-1">
        <li>Способ оплаты (название провайдера)</li>
        <li>Сумму и статус платежа</li>
        <li>Даты платежей</li>
        <li>Номер счёта</li>
      </ul>

      <SubTitle>2.6 Аналитические данные</SubTitle>
      <p>Мы собираем агрегированную статистику использования:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>Количество обращений в чат</li>
        <li>Среднее количество сообщений за сессию</li>
        <li>Среднее время ответа AI</li>
        <li>Распределение активности по часам</li>
        <li>Оценки ответов (положительные / отрицательные)</li>
      </ul>

      <SectionTitle>3. Условия оплаты, расчётный цикл и приостановка сервиса</SectionTitle>
      <p>
        Предоставление AI-виджета начинается с первоначального платежа, который покрывает разработку, настройку и
        эксплуатацию виджета в течение первых тридцати (30) дней. По истечении этого начального периода дальнейшая
        эксплуатация, обслуживание и техническая поддержка осуществляются на основе согласованной ежемесячной оплаты,
        взимаемой каждые 30 дней. Клиенту предоставляется льготный период в пять (5) календарных дней после окончания
        текущего 30-дневного расчётного цикла для осуществления платежа за продление. Неосуществление платежа в течение
        этого 5-дневного льготного периода повлечёт автоматическую приостановку или деактивацию виджета на веб-сайте
        Клиента до погашения задолженности.
      </p>

      <SectionTitle>4. Файлы cookie и локальное хранилище</SectionTitle>

      <SubTitle>4.1 Файлы cookie</SubTitle>
      <p>Платформа использует следующие cookie:</p>
      <div className="my-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-gray-300">
              <th className="py-2 pr-4">Название</th>
              <th className="py-2 pr-4">Тип</th>
              <th className="py-2 pr-4">Срок</th>
              <th className="py-2">Назначение</th>
            </tr>
          </thead>
          <tbody className="text-gray-400">
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4 font-mono text-xs">admin_token</td>
              <td className="py-2 pr-4">HttpOnly, Secure</td>
              <td className="py-2 pr-4">7 дней</td>
              <td className="py-2">Аутентификация администратора</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4 font-mono text-xs">client_token</td>
              <td className="py-2 pr-4">HttpOnly, Secure</td>
              <td className="py-2 pr-4">30 дней</td>
              <td className="py-2">Аутентификация клиента</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Все cookie являются строго необходимыми для работы сервиса (аутентификация). Мы не используем рекламные,
        маркетинговые или сторонние аналитические cookie.
      </p>

      <SubTitle>4.2 Локальное хранилище (localStorage)</SubTitle>
      <p>AI-виджет на сайте клиента использует localStorage браузера для:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>
          <span className="font-mono text-xs text-gray-300">widget_messages_&#123;clientId&#125;</span> — сохранение
          истории чата для продолжения сессии
        </li>
        <li>
          <span className="font-mono text-xs text-gray-300">widget_position_&#123;clientId&#125;</span> — позиция кнопки
          виджета на странице
        </li>
        <li>
          <span className="font-mono text-xs text-gray-300">cookie_consent</span> — статус принятия cookie на данном
          сайте
        </li>
      </ul>
      <p>Данные localStorage хранятся только в браузере пользователя и не передаются на сервер.</p>

      <SectionTitle>5. Как мы используем данные</SectionTitle>
      <p>Мы используем собранные данные для:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>Предоставления и поддержки сервиса AI-ассистента</li>
        <li>Обработки запросов пользователей и генерации ответов AI</li>
        <li>Управления учётными записями клиентов и подписками</li>
        <li>Аналитики и улучшения качества ответов AI</li>
        <li>Обработки платежей и выставления счетов</li>
        <li>Технической поддержки и обеспечения безопасности</li>
        <li>Соблюдения требований законодательства</li>
      </ul>

      <SubTitle>5.1 Правовые основания обработки (Статья 6 GDPR)</SubTitle>
      <div className="my-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-gray-300">
              <th className="py-2 pr-4">Цель обработки</th>
              <th className="py-2">Правовое основание</th>
            </tr>
          </thead>
          <tbody className="text-gray-400">
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">Предоставление и поддержка сервиса AI-ассистента</td>
              <td className="py-2">Исполнение договора (Art. 6(1)(b))</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">Обработка запросов и генерация ответов AI</td>
              <td className="py-2">Исполнение договора (Art. 6(1)(b))</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">Управление учётными записями и подписками</td>
              <td className="py-2">Исполнение договора (Art. 6(1)(b))</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">Аналитика и улучшение качества ответов AI</td>
              <td className="py-2">Законный интерес (Art. 6(1)(f))</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">Обработка платежей и выставление счетов</td>
              <td className="py-2">Исполнение договора (Art. 6(1)(b))</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">Техническая поддержка и безопасность</td>
              <td className="py-2">Законный интерес (Art. 6(1)(f))</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">Соблюдение требований законодательства</td>
              <td className="py-2">Юридическое обязательство (Art. 6(1)(c))</td>
            </tr>
          </tbody>
        </table>
      </div>

      <SectionTitle>6. Передача данных третьим сторонам</SectionTitle>
      <p>
        Мы передаём данные третьим сторонам исключительно для обеспечения работы сервиса. Мы не продаём и не передаём
        данные в рекламных целях.
      </p>

      <SubTitle>6.1 Google (Gemini API)</SubTitle>
      <p>
        Для генерации ответов AI мы передаём текст сообщений пользователя и контекст базы знаний в Google Gemini API.
        Google обрабатывает данные в соответствии со своей Политикой конфиденциальности.
      </p>

      <SubTitle>6.2 Google Sheets API</SubTitle>
      <p>По запросу клиента данные лидов могут экспортироваться в Google Sheets через сервисный аккаунт Google.</p>

      <SubTitle>6.3 Мессенджеры</SubTitle>
      <p>
        При подключении каналов Telegram, WhatsApp или Instagram сообщения маршрутизируются через соответствующие API
        (Telegram Bot API, WhatsApp Business API / WHAPI, Instagram Messaging API).
      </p>

      <SubTitle>6.4 Платёжные провайдеры</SubTitle>
      <p>
        Для обработки платежей мы используем WayForPay, Cryptomus и NowPayments. При оплате мы передаём провайдеру
        электронную почту, номер телефона и сумму платежа. Данные банковской карты обрабатываются напрямую платёжным
        провайдером и не проходят через наши серверы.
      </p>

      <SectionTitle>7. Сроки хранения данных</SectionTitle>
      <div className="my-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-gray-300">
              <th className="py-2 pr-4">Тип данных</th>
              <th className="py-2 pr-4">Срок хранения</th>
              <th className="py-2">Удаление</th>
            </tr>
          </thead>
          <tbody className="text-gray-400">
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">Cookie (аутентификация)</td>
              <td className="py-2 pr-4">7–30 дней</td>
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
              <td className="py-2 pr-4">Данные учётной записи</td>
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

      <SectionTitle>8. Ваши права</SectionTitle>
      <p>В соответствии с GDPR и законодательством Украины вы имеете право на:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>
          <strong className="text-gray-300">Доступ</strong> — запросить копию своих персональных данных
        </li>
        <li>
          <strong className="text-gray-300">Исправление</strong> — потребовать исправления неточных данных
        </li>
        <li>
          <strong className="text-gray-300">Удаление</strong> — потребовать удаления ваших данных
        </li>
        <li>
          <strong className="text-gray-300">Переносимость</strong> — получить данные в машиночитаемом формате
        </li>
        <li>
          <strong className="text-gray-300">Отзыв согласия</strong> — отозвать согласие на обработку данных в любое
          время
        </li>
        <li>
          <strong className="text-gray-300">Ограничение обработки</strong> — потребовать ограничения обработки при
          определённых условиях
        </li>
      </ul>
      <p>
        Для реализации своих прав свяжитесь с нами:{' '}
        <a href="mailto:winbix.ai@gmail.com" className="text-[var(--neon-cyan)] hover:underline">
          winbix.ai@gmail.com
        </a>
      </p>

      <SectionTitle>9. Демо-страницы</SectionTitle>
      <p>
        Платформа предоставляет демонстрационные страницы, на которых сайт потенциального клиента отображается в iframe
        вместе с нашим AI-виджетом. Это делается исключительно в целях предварительного просмотра.
      </p>
      <p>На демо-страницах:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>Мы не собираем дополнительные данные с отображаемого сайта</li>
        <li>Мы не изменяем содержимое сайта клиента</li>
        <li>Используются только общедоступные данные</li>
        <li>Демо создаётся для ознакомления и может быть удалено по запросу владельца сайта</li>
      </ul>

      <SectionTitle>10. Безопасность данных</SectionTitle>
      <p>Мы принимаем следующие меры:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>Флаги HttpOnly и Secure для cookie</li>
        <li>Защита SameSite=Lax от CSRF-атак</li>
        <li>Ограничение частоты запросов (Rate limiting)</li>
        <li>Шифрование TLS/HTTPS</li>
        <li>Аутентификация на стороне сервера</li>
        <li>Аудит-логирование всех критических действий</li>
      </ul>

      <SectionTitle>11. Изменения в политике</SectionTitle>
      <p>
        Мы оставляем за собой право обновлять настоящую Политику конфиденциальности. При существенных изменениях мы
        уведомим вас через Платформу или по электронной почте. Дата последнего обновления указана в начале документа.
      </p>

      <SectionTitle>12. Контактная информация</SectionTitle>
      <ul className="ml-6 list-disc space-y-1">
        <li>
          Email:{' '}
          <a href="mailto:winbix.ai@gmail.com" className="text-[var(--neon-cyan)] hover:underline">
            winbix.ai@gmail.com
          </a>
        </li>
        <li>
          Telegram:{' '}
          <a
            href="https://t.me/winbix_ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--neon-cyan)] hover:underline"
          >
            @winbix_ai
          </a>
        </li>
      </ul>
    </>
  );
}

/* ─────────────────────────── ENGLISH ─────────────────────────── */

function EnContent() {
  return (
    <>
      <SectionTitle>1. General Provisions</SectionTitle>
      <p>
        This Privacy Policy describes how WinBix AI (hereinafter &quot;Company&quot;, &quot;we&quot;, &quot;us&quot;)
        collects, uses, stores, and protects personal data of users of the platform winbix-ai.xyz (hereinafter
        &quot;Platform&quot;).
      </p>
      <p>
        By using the Platform, you confirm that you have read this Policy and consent to the processing of your data in
        accordance with it.
      </p>
      <p>
        The Platform operates in accordance with the Law of Ukraine &quot;On Protection of Personal Data&quot; (dated
        01.06.2010 No. 2297-VI), the General Data Protection Regulation of the European Union (GDPR), and other
        applicable regulations.
      </p>

      <SectionTitle>2. What Data We Collect</SectionTitle>

      <SubTitle>2.1 Client Account Data</SubTitle>
      <p>When registering on the Platform as a client, we may collect:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>Company name / username</li>
        <li>Email address</li>
        <li>Phone number</li>
        <li>Website address</li>
        <li>Physical addresses of offices / branches</li>
        <li>Social media accounts (Instagram, etc.)</li>
      </ul>

      <SubTitle>2.2 Chat Data (widget end users)</SubTitle>
      <p>When a client&apos;s website visitor interacts with the AI widget, we collect:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>Chat message text</li>
        <li>Session identifier (auto-generated)</li>
        <li>Message timestamps</li>
        <li>Uploaded images (when sent via widget)</li>
      </ul>

      <SubTitle>2.3 Technical Data</SubTitle>
      <p>Automatically collected technical information:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>IP address</li>
        <li>User-Agent (browser type, operating system, device)</li>
        <li>URL of the page where the widget is installed</li>
        <li>Communication channel (website, Telegram, WhatsApp, Instagram)</li>
      </ul>

      <SubTitle>2.4 Lead Data</SubTitle>
      <p>If a visitor leaves contact data via the widget:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>Name</li>
        <li>Email address</li>
        <li>Phone number</li>
        <li>Additional information provided by the user (service type, preferred date, etc.)</li>
      </ul>

      <SubTitle>2.5 Payment Data</SubTitle>
      <p>
        We do not store payment card data. Payment is processed by third-party payment providers (WayForPay, Cryptomus,
        NowPayments). We only save:
      </p>
      <ul className="ml-6 list-disc space-y-1">
        <li>Payment method (provider name)</li>
        <li>Amount and payment status</li>
        <li>Payment dates</li>
        <li>Invoice number</li>
      </ul>

      <SubTitle>2.6 Analytics Data</SubTitle>
      <p>We collect aggregated usage statistics:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>Number of chat inquiries</li>
        <li>Average messages per session</li>
        <li>Average AI response time</li>
        <li>Hourly activity distribution</li>
        <li>Response ratings (positive / negative)</li>
      </ul>

      <SectionTitle>3. Payment Terms, Billing Cycle, and Service Suspension</SectionTitle>
      <p>
        The provision of the AI widget begins with an initial payment, which covers the development, setup, and
        operation of the widget for the first thirty (30) days. Following this initial period, continued operation,
        maintenance, and technical support are subject to a recurring, agreed-upon monthly fee, billed every 30 days.
        The Client is provided a grace period of five (5) calendar days following the expiration of their current 30-day
        billing cycle to remit the renewal payment. Failure to process the payment within this 5-day grace period will
        result in the automatic suspension or deactivation of the widget on the Client&apos;s website until the
        outstanding balance is settled.
      </p>

      <SectionTitle>4. Cookies and Local Storage</SectionTitle>

      <SubTitle>4.1 Cookies</SubTitle>
      <p>The Platform uses the following cookies:</p>
      <div className="my-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-gray-300">
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Type</th>
              <th className="py-2 pr-4">Duration</th>
              <th className="py-2">Purpose</th>
            </tr>
          </thead>
          <tbody className="text-gray-400">
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4 font-mono text-xs">admin_token</td>
              <td className="py-2 pr-4">HttpOnly, Secure</td>
              <td className="py-2 pr-4">7 days</td>
              <td className="py-2">Administrator authentication</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4 font-mono text-xs">client_token</td>
              <td className="py-2 pr-4">HttpOnly, Secure</td>
              <td className="py-2 pr-4">30 days</td>
              <td className="py-2">Client authentication</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        All cookies are strictly necessary for service operation (authentication). We do not use advertising, marketing,
        or third-party analytics cookies.
      </p>

      <SubTitle>4.2 Local Storage (localStorage)</SubTitle>
      <p>The AI widget on the client&apos;s site uses browser localStorage for:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>
          <span className="font-mono text-xs text-gray-300">widget_messages_&#123;clientId&#125;</span> — saving chat
          history for session continuation
        </li>
        <li>
          <span className="font-mono text-xs text-gray-300">widget_position_&#123;clientId&#125;</span> — widget button
          position on the page
        </li>
        <li>
          <span className="font-mono text-xs text-gray-300">cookie_consent</span> — cookie acceptance status on this
          site
        </li>
      </ul>
      <p>localStorage data is stored only in the user&apos;s browser and is not transmitted to the server.</p>

      <SectionTitle>5. How We Use Data</SectionTitle>
      <p>We use collected data for:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>Providing and supporting the AI assistant service</li>
        <li>Processing user requests and generating AI responses</li>
        <li>Managing client accounts and subscriptions</li>
        <li>Analytics and improving AI response quality</li>
        <li>Processing payments and invoicing</li>
        <li>Technical support and security</li>
        <li>Compliance with legal requirements</li>
      </ul>

      <SubTitle>5.1 Legal Basis for Processing (Article 6 GDPR)</SubTitle>
      <div className="my-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-gray-300">
              <th className="py-2 pr-4">Processing Purpose</th>
              <th className="py-2">Legal Basis</th>
            </tr>
          </thead>
          <tbody className="text-gray-400">
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">Providing and supporting the AI assistant service</td>
              <td className="py-2">Performance of a contract (Art. 6(1)(b))</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">Processing requests and generating AI responses</td>
              <td className="py-2">Performance of a contract (Art. 6(1)(b))</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">Managing client accounts and subscriptions</td>
              <td className="py-2">Performance of a contract (Art. 6(1)(b))</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">Analytics and improving AI response quality</td>
              <td className="py-2">Legitimate interest (Art. 6(1)(f))</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">Processing payments and invoicing</td>
              <td className="py-2">Performance of a contract (Art. 6(1)(b))</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">Technical support and security</td>
              <td className="py-2">Legitimate interest (Art. 6(1)(f))</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">Compliance with legal requirements</td>
              <td className="py-2">Legal obligation (Art. 6(1)(c))</td>
            </tr>
          </tbody>
        </table>
      </div>

      <SectionTitle>6. Data Transfer to Third Parties</SectionTitle>
      <p>
        We transfer data to third parties exclusively for service operation. We do not sell or transfer data for
        advertising purposes.
      </p>

      <SubTitle>6.1 Google (Gemini API)</SubTitle>
      <p>
        To generate AI responses, we transmit user message text and knowledge base context to Google Gemini API. Google
        processes data in accordance with its Privacy Policy.
      </p>

      <SubTitle>6.2 Google Sheets API</SubTitle>
      <p>At the client&apos;s request, lead data may be exported to Google Sheets via a Google service account.</p>

      <SubTitle>6.3 Messengers</SubTitle>
      <p>
        When connecting Telegram, WhatsApp, or Instagram channels, messages are routed through the corresponding APIs
        (Telegram Bot API, WhatsApp Business API / WHAPI, Instagram Messaging API).
      </p>

      <SubTitle>6.4 Payment Providers</SubTitle>
      <p>
        For payment processing, we use WayForPay, Cryptomus, and NowPayments. During payment, we transmit email, phone
        number, and payment amount to the provider. Bank card data is processed directly by the payment provider and
        does not pass through our servers.
      </p>

      <SectionTitle>7. Data Retention Periods</SectionTitle>
      <div className="my-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-gray-300">
              <th className="py-2 pr-4">Data Type</th>
              <th className="py-2 pr-4">Retention Period</th>
              <th className="py-2">Deletion</th>
            </tr>
          </thead>
          <tbody className="text-gray-400">
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">Cookies (authentication)</td>
              <td className="py-2 pr-4">7–30 days</td>
              <td className="py-2">Automatically</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">Audit log</td>
              <td className="py-2 pr-4">90 days</td>
              <td className="py-2">Automatically (TTL)</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">Chat history</td>
              <td className="py-2 pr-4">Until account deletion</td>
              <td className="py-2">On request or account deletion</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">Lead data</td>
              <td className="py-2 pr-4">Until account deletion</td>
              <td className="py-2">On client request</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">Account data</td>
              <td className="py-2 pr-4">Until account deletion</td>
              <td className="py-2">On request</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">Invoices and payments</td>
              <td className="py-2 pr-4">As required by law</td>
              <td className="py-2">Within legally prescribed periods</td>
            </tr>
          </tbody>
        </table>
      </div>

      <SectionTitle>8. Your Rights</SectionTitle>
      <p>In accordance with GDPR and Ukrainian law, you have the right to:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>
          <strong className="text-gray-300">Access</strong> — request a copy of your personal data
        </li>
        <li>
          <strong className="text-gray-300">Rectification</strong> — require correction of inaccurate data
        </li>
        <li>
          <strong className="text-gray-300">Erasure</strong> — require deletion of your data
        </li>
        <li>
          <strong className="text-gray-300">Portability</strong> — receive data in a machine-readable format
        </li>
        <li>
          <strong className="text-gray-300">Withdrawal of consent</strong> — withdraw consent to data processing at any
          time
        </li>
        <li>
          <strong className="text-gray-300">Restriction of processing</strong> — require restriction of processing under
          certain conditions
        </li>
      </ul>
      <p>
        To exercise your rights, contact us:{' '}
        <a href="mailto:winbix.ai@gmail.com" className="text-[var(--neon-cyan)] hover:underline">
          winbix.ai@gmail.com
        </a>
      </p>

      <SectionTitle>9. Demo Pages</SectionTitle>
      <p>
        The Platform provides demonstration pages where a potential client&apos;s website is displayed in an iframe
        alongside our AI widget. This is done exclusively for preview purposes.
      </p>
      <p>On demo pages:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>We do not collect additional data from the displayed site</li>
        <li>We do not modify the client&apos;s website content</li>
        <li>Only publicly available data is used</li>
        <li>Demo is created for familiarization purposes and can be removed at the site owner&apos;s request</li>
      </ul>

      <SectionTitle>10. Data Security</SectionTitle>
      <p>We take the following measures:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>HttpOnly and Secure cookie flags</li>
        <li>SameSite=Lax protection against CSRF attacks</li>
        <li>Rate limiting</li>
        <li>TLS/HTTPS encryption</li>
        <li>Server-side authentication</li>
        <li>Audit logging of all critical actions</li>
      </ul>

      <SectionTitle>11. Policy Changes</SectionTitle>
      <p>
        We reserve the right to update this Privacy Policy. For significant changes, we will notify you through the
        Platform or by email. The last update date is indicated at the beginning of the document.
      </p>

      <SectionTitle>12. Contact Information</SectionTitle>
      <ul className="ml-6 list-disc space-y-1">
        <li>
          Email:{' '}
          <a href="mailto:winbix.ai@gmail.com" className="text-[var(--neon-cyan)] hover:underline">
            winbix.ai@gmail.com
          </a>
        </li>
        <li>
          Telegram:{' '}
          <a
            href="https://t.me/winbix_ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--neon-cyan)] hover:underline"
          >
            @winbix_ai
          </a>
        </li>
      </ul>
    </>
  );
}

/* ─────────────────────────── UKRAINIAN ─────────────────────────── */

function UkContent() {
  return (
    <>
      <SectionTitle>1. Загальні положення</SectionTitle>
      <p>
        Ця Політика конфіденційності описує, як WinBix AI (далі — «Компанія», «ми», «нас») збирає, використовує,
        зберігає та захищає персональні дані користувачів платформи winbix-ai.xyz (далі — «Платформа»).
      </p>
      <p>
        Використовуючи Платформу, ви підтверджуєте, що ознайомилися з цією Політикою та даєте згоду на обробку ваших
        даних відповідно до неї.
      </p>
      <p>
        Платформа діє відповідно до Закону України «Про захист персональних даних» (від 01.06.2010 № 2297-VI),
        Загального регламенту захисту даних Європейського Союзу (GDPR) та інших застосовних нормативних актів.
      </p>

      <SectionTitle>2. Які дані ми збираємо</SectionTitle>

      <SubTitle>2.1 Дані облікового запису клієнта</SubTitle>
      <p>При реєстрації на Платформі як клієнт ми можемо збирати:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>Назву компанії / ім&apos;я користувача</li>
        <li>Адресу електронної пошти</li>
        <li>Номер телефону</li>
        <li>Адресу веб-сайту</li>
        <li>Фізичні адреси офісів / філій</li>
        <li>Акаунти в соціальних мережах (Instagram тощо)</li>
      </ul>

      <SubTitle>2.2 Дані чату (кінцеві користувачі віджета)</SubTitle>
      <p>Коли відвідувач сайту клієнта взаємодіє з AI-віджетом, ми збираємо:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>Текст повідомлень чату</li>
        <li>Ідентифікатор сесії (генерується автоматично)</li>
        <li>Часові мітки повідомлень</li>
        <li>Завантажені зображення (при надсиланні через віджет)</li>
      </ul>

      <SubTitle>2.3 Технічні дані</SubTitle>
      <p>Автоматично зібрана технічна інформація:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>IP-адреса</li>
        <li>User-Agent (тип браузера, операційна система, пристрій)</li>
        <li>URL сторінки, на якій встановлено віджет</li>
        <li>Канал зв&apos;язку (веб-сайт, Telegram, WhatsApp, Instagram)</li>
      </ul>

      <SubTitle>2.4 Дані лідів</SubTitle>
      <p>Якщо відвідувач залишає контактні дані через віджет:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>Ім&apos;я</li>
        <li>Адресу електронної пошти</li>
        <li>Номер телефону</li>
        <li>Додаткову інформацію, надану користувачем (тип послуги, бажана дата тощо)</li>
      </ul>

      <SubTitle>2.5 Платіжні дані</SubTitle>
      <p>
        Ми не зберігаємо дані платіжних карток. Оплата обробляється сторонніми платіжними провайдерами (WayForPay,
        Cryptomus, NowPayments). Ми зберігаємо лише:
      </p>
      <ul className="ml-6 list-disc space-y-1">
        <li>Спосіб оплати (назва провайдера)</li>
        <li>Суму та статус платежу</li>
        <li>Дати платежів</li>
        <li>Номер рахунку</li>
      </ul>

      <SubTitle>2.6 Аналітичні дані</SubTitle>
      <p>Ми збираємо агреговану статистику використання:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>Кількість звернень у чат</li>
        <li>Середню кількість повідомлень за сесію</li>
        <li>Середній час відповіді AI</li>
        <li>Розподіл активності за годинами</li>
        <li>Оцінки відповідей (позитивні / негативні)</li>
      </ul>

      <SectionTitle>3. Умови оплати, розрахунковий цикл та призупинення сервісу</SectionTitle>
      <p>
        Надання AI-віджета починається з початкового платежу, який покриває розробку, налаштування та експлуатацію
        віджета протягом перших тридцяти (30) днів. Після завершення цього початкового періоду подальша експлуатація,
        обслуговування та технічна підтримка здійснюються на основі узгодженої щомісячної оплати, що стягується кожні 30
        днів. Клієнту надається пільговий період у п&apos;ять (5) календарних днів після закінчення поточного 30-денного
        розрахункового циклу для здійснення платежу за продовження. Нездійснення платежу протягом цього 5-денного
        пільгового періоду призведе до автоматичного призупинення або деактивації віджета на веб-сайті Клієнта до
        погашення заборгованості.
      </p>

      <SectionTitle>4. Файли cookie та локальне сховище</SectionTitle>

      <SubTitle>4.1 Файли cookie</SubTitle>
      <p>Платформа використовує такі cookie:</p>
      <div className="my-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-gray-300">
              <th className="py-2 pr-4">Назва</th>
              <th className="py-2 pr-4">Тип</th>
              <th className="py-2 pr-4">Термін</th>
              <th className="py-2">Призначення</th>
            </tr>
          </thead>
          <tbody className="text-gray-400">
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4 font-mono text-xs">admin_token</td>
              <td className="py-2 pr-4">HttpOnly, Secure</td>
              <td className="py-2 pr-4">7 днів</td>
              <td className="py-2">Автентифікація адміністратора</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4 font-mono text-xs">client_token</td>
              <td className="py-2 pr-4">HttpOnly, Secure</td>
              <td className="py-2 pr-4">30 днів</td>
              <td className="py-2">Автентифікація клієнта</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Усі cookie є суворо необхідними для роботи сервісу (автентифікація). Ми не використовуємо рекламні, маркетингові
        або сторонні аналітичні cookie.
      </p>

      <SubTitle>4.2 Локальне сховище (localStorage)</SubTitle>
      <p>AI-віджет на сайті клієнта використовує localStorage браузера для:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>
          <span className="font-mono text-xs text-gray-300">widget_messages_&#123;clientId&#125;</span> — збереження
          історії чату для продовження сесії
        </li>
        <li>
          <span className="font-mono text-xs text-gray-300">widget_position_&#123;clientId&#125;</span> — позиція кнопки
          віджета на сторінці
        </li>
        <li>
          <span className="font-mono text-xs text-gray-300">cookie_consent</span> — статус прийняття cookie на цьому
          сайті
        </li>
      </ul>
      <p>Дані localStorage зберігаються лише у браузері користувача і не передаються на сервер.</p>

      <SectionTitle>5. Як ми використовуємо дані</SectionTitle>
      <p>Ми використовуємо зібрані дані для:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>Надання та підтримки сервісу AI-асистента</li>
        <li>Обробки запитів користувачів та генерації відповідей AI</li>
        <li>Управління обліковими записами клієнтів та підписками</li>
        <li>Аналітики та покращення якості відповідей AI</li>
        <li>Обробки платежів та виставлення рахунків</li>
        <li>Технічної підтримки та забезпечення безпеки</li>
        <li>Дотримання законодавчих вимог</li>
      </ul>

      <SubTitle>5.1 Правові підстави обробки (Стаття 6 GDPR)</SubTitle>
      <div className="my-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-gray-300">
              <th className="py-2 pr-4">Мета обробки</th>
              <th className="py-2">Правова підстава</th>
            </tr>
          </thead>
          <tbody className="text-gray-400">
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">Надання та підтримка сервісу AI-асистента</td>
              <td className="py-2">Виконання договору (Art. 6(1)(b))</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">Обробка запитів та генерація відповідей AI</td>
              <td className="py-2">Виконання договору (Art. 6(1)(b))</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">Управління обліковими записами та підписками</td>
              <td className="py-2">Виконання договору (Art. 6(1)(b))</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">Аналітика та покращення якості відповідей AI</td>
              <td className="py-2">Законний інтерес (Art. 6(1)(f))</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">Обробка платежів та виставлення рахунків</td>
              <td className="py-2">Виконання договору (Art. 6(1)(b))</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">Технічна підтримка та безпека</td>
              <td className="py-2">Законний інтерес (Art. 6(1)(f))</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">Дотримання законодавчих вимог</td>
              <td className="py-2">Юридичне зобов&apos;язання (Art. 6(1)(c))</td>
            </tr>
          </tbody>
        </table>
      </div>

      <SectionTitle>6. Передача даних третім сторонам</SectionTitle>
      <p>
        Ми передаємо дані третім сторонам виключно для забезпечення роботи сервісу. Ми не продаємо і не передаємо дані в
        рекламних цілях.
      </p>

      <SubTitle>6.1 Google (Gemini API)</SubTitle>
      <p>
        Для генерації відповідей AI ми передаємо текст повідомлень користувача та контекст бази знань до Google Gemini
        API. Google обробляє дані відповідно до своєї Політики конфіденційності.
      </p>

      <SubTitle>6.2 Google Sheets API</SubTitle>
      <p>
        За запитом клієнта дані лідів можуть експортуватися до Google Sheets через сервісний обліковий запис Google.
      </p>

      <SubTitle>6.3 Месенджери</SubTitle>
      <p>
        При підключенні каналів Telegram, WhatsApp або Instagram повідомлення маршрутизуються через відповідні API
        (Telegram Bot API, WhatsApp Business API / WHAPI, Instagram Messaging API).
      </p>

      <SubTitle>6.4 Платіжні провайдери</SubTitle>
      <p>
        Для обробки платежів ми використовуємо WayForPay, Cryptomus та NowPayments. Під час оплати ми передаємо
        провайдеру електронну пошту, номер телефону та суму платежу. Дані банківської картки обробляються безпосередньо
        платіжним провайдером і не проходять через наші сервери.
      </p>

      <SectionTitle>7. Строки зберігання даних</SectionTitle>
      <div className="my-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-gray-300">
              <th className="py-2 pr-4">Тип даних</th>
              <th className="py-2 pr-4">Строк зберігання</th>
              <th className="py-2">Видалення</th>
            </tr>
          </thead>
          <tbody className="text-gray-400">
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">Cookie (автентифікація)</td>
              <td className="py-2 pr-4">7–30 днів</td>
              <td className="py-2">Автоматично</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">Журнал аудиту</td>
              <td className="py-2 pr-4">90 днів</td>
              <td className="py-2">Автоматично (TTL)</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">Історія чатів</td>
              <td className="py-2 pr-4">До видалення облікового запису</td>
              <td className="py-2">За запитом або при видаленні облікового запису</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">Дані лідів</td>
              <td className="py-2 pr-4">До видалення облікового запису</td>
              <td className="py-2">За запитом клієнта</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">Дані облікового запису</td>
              <td className="py-2 pr-4">До видалення облікового запису</td>
              <td className="py-2">За запитом</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">Рахунки та платежі</td>
              <td className="py-2 pr-4">Відповідно до вимог законодавства</td>
              <td className="py-2">У встановлені законом строки</td>
            </tr>
          </tbody>
        </table>
      </div>

      <SectionTitle>8. Ваші права</SectionTitle>
      <p>Відповідно до GDPR та законодавства України ви маєте право на:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>
          <strong className="text-gray-300">Доступ</strong> — запросити копію своїх персональних даних
        </li>
        <li>
          <strong className="text-gray-300">Виправлення</strong> — вимагати виправлення неточних даних
        </li>
        <li>
          <strong className="text-gray-300">Видалення</strong> — вимагати видалення ваших даних
        </li>
        <li>
          <strong className="text-gray-300">Переносимість</strong> — отримати дані у машиночитаному форматі
        </li>
        <li>
          <strong className="text-gray-300">Відкликання згоди</strong> — відкликати згоду на обробку даних у будь-який
          час
        </li>
        <li>
          <strong className="text-gray-300">Обмеження обробки</strong> — вимагати обмеження обробки за певних умов
        </li>
      </ul>
      <p>
        Для реалізації своїх прав зв&apos;яжіться з нами:{' '}
        <a href="mailto:winbix.ai@gmail.com" className="text-[var(--neon-cyan)] hover:underline">
          winbix.ai@gmail.com
        </a>
      </p>

      <SectionTitle>9. Демо-сторінки</SectionTitle>
      <p>
        Платформа надає демонстраційні сторінки, на яких сайт потенційного клієнта відображається в iframe разом з нашим
        AI-віджетом. Це робиться виключно з метою попереднього перегляду.
      </p>
      <p>На демо-сторінках:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>Ми не збираємо додаткові дані з відображеного сайту</li>
        <li>Ми не змінюємо вміст сайту клієнта</li>
        <li>Використовуються лише загальнодоступні дані</li>
        <li>Демо створюється для ознайомлення і може бути видалене за запитом власника сайту</li>
      </ul>

      <SectionTitle>10. Безпека даних</SectionTitle>
      <p>Ми вживаємо таких заходів:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>Прапорці HttpOnly та Secure для cookie</li>
        <li>Захист SameSite=Lax від CSRF-атак</li>
        <li>Обмеження частоти запитів (Rate limiting)</li>
        <li>Шифрування TLS/HTTPS</li>
        <li>Автентифікація на стороні сервера</li>
        <li>Аудит-логування всіх критичних дій</li>
      </ul>

      <SectionTitle>11. Зміни в політиці</SectionTitle>
      <p>
        Ми залишаємо за собою право оновлювати цю Політику конфіденційності. При суттєвих змінах ми повідомимо вас через
        Платформу або електронною поштою. Дата останнього оновлення вказана на початку документа.
      </p>

      <SectionTitle>12. Контактна інформація</SectionTitle>
      <ul className="ml-6 list-disc space-y-1">
        <li>
          Email:{' '}
          <a href="mailto:winbix.ai@gmail.com" className="text-[var(--neon-cyan)] hover:underline">
            winbix.ai@gmail.com
          </a>
        </li>
        <li>
          Telegram:{' '}
          <a
            href="https://t.me/winbix_ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--neon-cyan)] hover:underline"
          >
            @winbix_ai
          </a>
        </li>
      </ul>
    </>
  );
}

/* ─────────────────────────── POLISH ─────────────────────────── */

function PlContent() {
  return (
    <>
      <SectionTitle>1. Postanowienia ogólne</SectionTitle>
      <p>
        Niniejsza Polityka prywatności opisuje, w jaki sposób WinBix AI (dalej „Firma", „my", „nas") gromadzi,
        wykorzystuje, przechowuje i chroni dane osobowe użytkowników platformy winbix-ai.xyz (dalej „Platforma").
      </p>
      <p>
        Korzystając z Platformy, potwierdzasz, że zapoznałeś się z niniejszą Polityką i wyrażasz zgodę na przetwarzanie
        danych zgodnie z nią.
      </p>
      <p>
        Platforma działa zgodnie z ustawodawstwem Ukrainy dotyczącym ochrony danych osobowych, Ogólnym rozporządzeniem o
        ochronie danych UE (RODO) oraz innymi obowiązującymi przepisami.
      </p>

      <SectionTitle>2. Jakie dane zbieramy</SectionTitle>

      <SubTitle>2.1 Dane konta klienta</SubTitle>
      <p>Podczas rejestracji na Platformie jako klient możemy zbierać:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>Nazwę firmy / imię użytkownika</li>
        <li>Adres e-mail</li>
        <li>Numer telefonu</li>
        <li>Adres strony internetowej</li>
        <li>Adresy fizyczne biur / oddziałów</li>
        <li>Konta w mediach społecznościowych (Instagram itp.)</li>
      </ul>

      <SubTitle>2.2 Dane czatu (użytkownicy końcowi widżetu)</SubTitle>
      <p>Gdy odwiedzający stronę klienta wchodzi w interakcję z widżetem AI, zbieramy:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>Tekst wiadomości czatu</li>
        <li>Identyfikator sesji (generowany automatycznie)</li>
        <li>Znaczniki czasu wiadomości</li>
        <li>Przesłane obrazy (w przypadku wysłania przez widżet)</li>
      </ul>

      <SubTitle>2.3 Dane techniczne</SubTitle>
      <p>Automatycznie zbierane informacje techniczne:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>Adres IP</li>
        <li>User-Agent (typ przeglądarki, system operacyjny, urządzenie)</li>
        <li>URL strony, na której zainstalowany jest widżet</li>
        <li>Kanał komunikacji (strona internetowa, Telegram, WhatsApp, Instagram)</li>
      </ul>

      <SubTitle>2.4 Dane leadów</SubTitle>
      <p>Jeśli odwiedzający pozostawia dane kontaktowe przez widżet:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>Imię i nazwisko</li>
        <li>Adres e-mail</li>
        <li>Numer telefonu</li>
        <li>Dodatkowe informacje podane przez użytkownika (rodzaj usługi, preferowana data itp.)</li>
      </ul>

      <SubTitle>2.5 Dane płatnicze</SubTitle>
      <p>
        Nie przechowujemy danych kart płatniczych. Płatności są przetwarzane przez zewnętrznych dostawców usług
        płatniczych (WayForPay, Cryptomus, NowPayments). Przechowujemy jedynie:
      </p>
      <ul className="ml-6 list-disc space-y-1">
        <li>Metodę płatności (nazwa dostawcy)</li>
        <li>Kwotę i status płatności</li>
        <li>Daty płatności</li>
        <li>Numer konta</li>
      </ul>

      <SubTitle>2.6 Dane analityczne</SubTitle>
      <p>Zbieramy zagregowane statystyki użytkowania:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>Liczbę zgłoszeń na czacie</li>
        <li>Średnią liczbę wiadomości na sesję</li>
        <li>Średni czas odpowiedzi AI</li>
        <li>Rozkład aktywności w godzinach</li>
        <li>Oceny odpowiedzi (pozytywne / negatywne)</li>
      </ul>

      <SectionTitle>3. Warunki płatności, cykl rozliczeniowy i zawieszenie usługi</SectionTitle>
      <p>
        Świadczenie usługi widżetu AI rozpoczyna się od płatności początkowej, która obejmuje opracowanie, konfigurację
        i działanie widżetu przez pierwsze trzydzieści (30) dni. Po upływie tego początkowego okresu dalsze działanie,
        utrzymanie i wsparcie techniczne podlegają uzgodnionej cyklicznej opłacie miesięcznej, naliczanej co 30 dni.
        Klientowi przysługuje okres karencji wynoszący pięć (5) dni kalendarzowych po wygaśnięciu bieżącego 30-dniowego
        cyklu rozliczeniowego na dokonanie płatności za odnowienie. Niedokonanie płatności w ciągu tego 5-dniowego
        okresu karencji spowoduje automatyczne zawieszenie lub dezaktywację widżetu na stronie internetowej Klienta do
        momentu uregulowania zaległej kwoty.
      </p>

      <SectionTitle>4. Pliki cookie i pamięć lokalna</SectionTitle>

      <SubTitle>4.1 Pliki cookie</SubTitle>
      <p>Platforma wykorzystuje następujące pliki cookie:</p>
      <div className="my-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-gray-300">
              <th className="py-2 pr-4">Nazwa</th>
              <th className="py-2 pr-4">Typ</th>
              <th className="py-2 pr-4">Okres</th>
              <th className="py-2">Przeznaczenie</th>
            </tr>
          </thead>
          <tbody className="text-gray-400">
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4 font-mono text-xs">admin_token</td>
              <td className="py-2 pr-4">HttpOnly, Secure</td>
              <td className="py-2 pr-4">7 dni</td>
              <td className="py-2">Uwierzytelnianie administratora</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4 font-mono text-xs">client_token</td>
              <td className="py-2 pr-4">HttpOnly, Secure</td>
              <td className="py-2 pr-4">30 dni</td>
              <td className="py-2">Uwierzytelnianie klienta</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Wszystkie pliki cookie są ściśle niezbędne do działania usługi (uwierzytelnianie). Nie używamy reklamowych,
        marketingowych ani zewnętrznych analitycznych plików cookie.
      </p>

      <SubTitle>4.2 Pamięć lokalna (localStorage)</SubTitle>
      <p>Widżet AI na stronie klienta wykorzystuje localStorage przeglądarki do:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>
          <span className="font-mono text-xs text-gray-300">widget_messages_&#123;clientId&#125;</span> — zapisywanie
          historii czatu w celu kontynuacji sesji
        </li>
        <li>
          <span className="font-mono text-xs text-gray-300">widget_position_&#123;clientId&#125;</span> — pozycja
          przycisku widżetu na stronie
        </li>
        <li>
          <span className="font-mono text-xs text-gray-300">cookie_consent</span> — status akceptacji plików cookie na
          tej stronie
        </li>
      </ul>
      <p>Dane localStorage są przechowywane wyłącznie w przeglądarce użytkownika i nie są przesyłane na serwer.</p>

      <SectionTitle>5. Jak wykorzystujemy dane</SectionTitle>
      <p>Wykorzystujemy zebrane dane w celu:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>Świadczenia i wspierania usługi asystenta AI</li>
        <li>Przetwarzania zapytań użytkowników i generowania odpowiedzi AI</li>
        <li>Zarządzania kontami klientów i subskrypcjami</li>
        <li>Analityki i poprawy jakości odpowiedzi AI</li>
        <li>Przetwarzania płatności i wystawiania faktur</li>
        <li>Wsparcia technicznego i bezpieczeństwa</li>
        <li>Spełniania wymogów prawnych</li>
      </ul>

      <SubTitle>5.1 Podstawy prawne przetwarzania (Artykuł 6 RODO)</SubTitle>
      <div className="my-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-gray-300">
              <th className="py-2 pr-4">Cel przetwarzania</th>
              <th className="py-2">Podstawa prawna</th>
            </tr>
          </thead>
          <tbody className="text-gray-400">
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">Świadczenie i wspieranie usługi asystenta AI</td>
              <td className="py-2">Wykonanie umowy (Art. 6(1)(b))</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">Przetwarzanie zapytań i generowanie odpowiedzi AI</td>
              <td className="py-2">Wykonanie umowy (Art. 6(1)(b))</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">Zarządzanie kontami klientów i subskrypcjami</td>
              <td className="py-2">Wykonanie umowy (Art. 6(1)(b))</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">Analityka i poprawa jakości odpowiedzi AI</td>
              <td className="py-2">Uzasadniony interes (Art. 6(1)(f))</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">Przetwarzanie płatności i wystawianie faktur</td>
              <td className="py-2">Wykonanie umowy (Art. 6(1)(b))</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">Wsparcie techniczne i bezpieczeństwo</td>
              <td className="py-2">Uzasadniony interes (Art. 6(1)(f))</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">Spełnianie wymogów prawnych</td>
              <td className="py-2">Obowiązek prawny (Art. 6(1)(c))</td>
            </tr>
          </tbody>
        </table>
      </div>

      <SectionTitle>6. Przekazywanie danych stronom trzecim</SectionTitle>
      <p>
        Przekazujemy dane stronom trzecim wyłącznie w celu zapewnienia działania usługi. Nie sprzedajemy ani nie
        przekazujemy danych w celach reklamowych.
      </p>

      <SubTitle>6.1 Google (Gemini API)</SubTitle>
      <p>
        W celu generowania odpowiedzi AI przekazujemy tekst wiadomości użytkownika i kontekst bazy wiedzy do Google
        Gemini API. Google przetwarza dane zgodnie ze swoją Polityką prywatności.
      </p>

      <SubTitle>6.2 Google Sheets API</SubTitle>
      <p>
        Na życzenie klienta dane leadów mogą być eksportowane do Google Sheets za pośrednictwem konta usługowego Google.
      </p>

      <SubTitle>6.3 Komunikatory</SubTitle>
      <p>
        Po podłączeniu kanałów Telegram, WhatsApp lub Instagram wiadomości są kierowane przez odpowiednie API (Telegram
        Bot API, WhatsApp Business API / WHAPI, Instagram Messaging API).
      </p>

      <SubTitle>6.4 Dostawcy usług płatniczych</SubTitle>
      <p>
        Do przetwarzania płatności wykorzystujemy WayForPay, Cryptomus i NowPayments. Podczas płatności przekazujemy
        dostawcy adres e-mail, numer telefonu i kwotę płatności. Dane karty bankowej są przetwarzane bezpośrednio przez
        dostawcę usług płatniczych i nie przechodzą przez nasze serwery.
      </p>

      <SectionTitle>7. Okresy przechowywania danych</SectionTitle>
      <div className="my-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-gray-300">
              <th className="py-2 pr-4">Typ danych</th>
              <th className="py-2 pr-4">Okres przechowywania</th>
              <th className="py-2">Usunięcie</th>
            </tr>
          </thead>
          <tbody className="text-gray-400">
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">Cookie (uwierzytelnianie)</td>
              <td className="py-2 pr-4">7–30 dni</td>
              <td className="py-2">Automatycznie</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">Dziennik audytu</td>
              <td className="py-2 pr-4">90 dni</td>
              <td className="py-2">Automatycznie (TTL)</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">Historia czatów</td>
              <td className="py-2 pr-4">Do usunięcia konta</td>
              <td className="py-2">Na żądanie lub po usunięciu konta</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">Dane leadów</td>
              <td className="py-2 pr-4">Do usunięcia konta</td>
              <td className="py-2">Na żądanie klienta</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">Dane konta</td>
              <td className="py-2 pr-4">Do usunięcia konta</td>
              <td className="py-2">Na żądanie</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">Faktury i płatności</td>
              <td className="py-2 pr-4">Zgodnie z wymogami prawa</td>
              <td className="py-2">W terminach określonych prawem</td>
            </tr>
          </tbody>
        </table>
      </div>

      <SectionTitle>8. Twoje prawa</SectionTitle>
      <p>Zgodnie z RODO i prawem ukraińskim masz prawo do:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>
          <strong className="text-gray-300">Dostęp</strong> — żądanie kopii swoich danych osobowych
        </li>
        <li>
          <strong className="text-gray-300">Sprostowanie</strong> — żądanie poprawienia niedokładnych danych
        </li>
        <li>
          <strong className="text-gray-300">Usunięcie</strong> — żądanie usunięcia swoich danych
        </li>
        <li>
          <strong className="text-gray-300">Przenoszenie</strong> — otrzymanie danych w formacie nadającym się do
          odczytu maszynowego
        </li>
        <li>
          <strong className="text-gray-300">Wycofanie zgody</strong> — wycofanie zgody na przetwarzanie danych w
          dowolnym momencie
        </li>
        <li>
          <strong className="text-gray-300">Ograniczenie przetwarzania</strong> — żądanie ograniczenia przetwarzania w
          określonych warunkach
        </li>
      </ul>
      <p>
        Aby skorzystać ze swoich praw, skontaktuj się z nami:{' '}
        <a href="mailto:winbix.ai@gmail.com" className="text-[var(--neon-cyan)] hover:underline">
          winbix.ai@gmail.com
        </a>
      </p>

      <SectionTitle>9. Strony demonstracyjne</SectionTitle>
      <p>
        Platforma udostępnia strony demonstracyjne, na których strona potencjalnego klienta jest wyświetlana w iframe
        wraz z naszym widżetem AI. Odbywa się to wyłącznie w celach podglądowych.
      </p>
      <p>Na stronach demonstracyjnych:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>Nie zbieramy dodatkowych danych z wyświetlanej strony</li>
        <li>Nie modyfikujemy treści strony klienta</li>
        <li>Wykorzystywane są wyłącznie publicznie dostępne dane</li>
        <li>Demo jest tworzone w celach zapoznawczych i może zostać usunięte na żądanie właściciela strony</li>
      </ul>

      <SectionTitle>10. Bezpieczeństwo danych</SectionTitle>
      <p>Stosujemy następujące środki:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>Flagi HttpOnly i Secure dla plików cookie</li>
        <li>Ochrona SameSite=Lax przed atakami CSRF</li>
        <li>Ograniczanie częstotliwości żądań (Rate limiting)</li>
        <li>Szyfrowanie TLS/HTTPS</li>
        <li>Uwierzytelnianie po stronie serwera</li>
        <li>Rejestrowanie audytu wszystkich krytycznych działań</li>
      </ul>

      <SectionTitle>11. Zmiany w polityce</SectionTitle>
      <p>
        Zastrzegamy sobie prawo do aktualizacji niniejszej Polityki prywatności. W przypadku istotnych zmian powiadomimy
        Cię za pośrednictwem Platformy lub e-mailem. Data ostatniej aktualizacji jest podana na początku dokumentu.
      </p>

      <SectionTitle>12. Dane kontaktowe</SectionTitle>
      <ul className="ml-6 list-disc space-y-1">
        <li>
          Email:{' '}
          <a href="mailto:winbix.ai@gmail.com" className="text-[var(--neon-cyan)] hover:underline">
            winbix.ai@gmail.com
          </a>
        </li>
        <li>
          Telegram:{' '}
          <a
            href="https://t.me/winbix_ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--neon-cyan)] hover:underline"
          >
            @winbix_ai
          </a>
        </li>
      </ul>
    </>
  );
}

/* ─────────────────────────── ARABIC ─────────────────────────── */

function ArContent() {
  return (
    <>
      <SectionTitle>1. أحكام عامة</SectionTitle>
      <p>
        توضح سياسة الخصوصية هذه كيف تقوم WinBix AI (المشار إليها فيما بعد بـ &quot;الشركة&quot;، &quot;نحن&quot;) بجمع
        واستخدام وتخزين وحماية البيانات الشخصية لمستخدمي منصة winbix-ai.xyz (المشار إليها فيما بعد بـ
        &quot;المنصة&quot;).
      </p>
      <p>باستخدام المنصة، فإنك تؤكد أنك قد اطلعت على هذه السياسة وتوافق على معالجة بياناتك وفقًا لها.</p>
      <p>
        تعمل المنصة وفقًا لقانون أوكرانيا &quot;بشأن حماية البيانات الشخصية&quot; (بتاريخ 01.06.2010 رقم 2297-VI)،
        واللائحة العامة لحماية البيانات في الاتحاد الأوروبي (GDPR)، والأنظمة الأخرى المعمول بها.
      </p>

      <SectionTitle>2. ما البيانات التي نجمعها</SectionTitle>

      <SubTitle>2.1 بيانات حساب العميل</SubTitle>
      <p>عند التسجيل على المنصة كعميل، قد نجمع:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>اسم الشركة / اسم المستخدم</li>
        <li>عنوان البريد الإلكتروني</li>
        <li>رقم الهاتف</li>
        <li>عنوان الموقع الإلكتروني</li>
        <li>العناوين الفعلية للمكاتب / الفروع</li>
        <li>حسابات وسائل التواصل الاجتماعي (Instagram وغيرها)</li>
      </ul>

      <SubTitle>2.2 بيانات الدردشة (المستخدمون النهائيون للويدجت)</SubTitle>
      <p>عندما يتفاعل زائر موقع العميل مع ويدجت الذكاء الاصطناعي، نجمع:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>نص رسائل الدردشة</li>
        <li>معرّف الجلسة (يُنشأ تلقائيًا)</li>
        <li>الطوابع الزمنية للرسائل</li>
        <li>الصور المرفوعة (في حالة إرسالها عبر الويدجت)</li>
      </ul>

      <SubTitle>2.3 البيانات التقنية</SubTitle>
      <p>المعلومات التقنية المجمّعة تلقائيًا:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>عنوان IP</li>
        <li>User-Agent (نوع المتصفح، نظام التشغيل، الجهاز)</li>
        <li>عنوان URL للصفحة التي تم تثبيت الويدجت عليها</li>
        <li>قناة الاتصال (الموقع الإلكتروني، Telegram، WhatsApp، Instagram)</li>
      </ul>

      <SubTitle>2.4 بيانات العملاء المحتملين</SubTitle>
      <p>إذا ترك الزائر بيانات الاتصال عبر الويدجت:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>الاسم</li>
        <li>عنوان البريد الإلكتروني</li>
        <li>رقم الهاتف</li>
        <li>معلومات إضافية يقدمها المستخدم (نوع الخدمة، التاريخ المفضل، إلخ)</li>
      </ul>

      <SubTitle>2.5 بيانات الدفع</SubTitle>
      <p>
        لا نخزن بيانات بطاقات الدفع. تتم معالجة المدفوعات بواسطة مزودي خدمات دفع خارجيين (WayForPay، Cryptomus،
        NowPayments). نحتفظ فقط بـ:
      </p>
      <ul className="ml-6 list-disc space-y-1">
        <li>طريقة الدفع (اسم المزود)</li>
        <li>المبلغ وحالة الدفع</li>
        <li>تواريخ الدفع</li>
        <li>رقم الحساب</li>
      </ul>

      <SubTitle>2.6 البيانات التحليلية</SubTitle>
      <p>نجمع إحصائيات استخدام مجمّعة:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>عدد طلبات الدردشة</li>
        <li>متوسط عدد الرسائل لكل جلسة</li>
        <li>متوسط وقت استجابة الذكاء الاصطناعي</li>
        <li>توزيع النشاط حسب الساعات</li>
        <li>تقييمات الردود (إيجابية / سلبية)</li>
      </ul>

      <SectionTitle>3. شروط الدفع ودورة الفوترة وتعليق الخدمة</SectionTitle>
      <p>
        يبدأ تقديم ويدجت الذكاء الاصطناعي بدفعة أولية تغطي تطوير الويدجت وإعداده وتشغيله خلال الثلاثين (30) يومًا
        الأولى. بعد انتهاء هذه الفترة الأولية، يخضع استمرار التشغيل والصيانة والدعم الفني لرسوم شهرية متكررة ومتفق
        عليها، يتم احتسابها كل 30 يومًا. يُمنح العميل فترة سماح مدتها خمسة (5) أيام تقويمية بعد انتهاء دورة الفوترة
        الحالية البالغة 30 يومًا لتسديد دفعة التجديد. سيؤدي عدم معالجة الدفع خلال فترة السماح هذه البالغة 5 أيام إلى
        تعليق أو إلغاء تفعيل الويدجت تلقائيًا على موقع العميل الإلكتروني حتى يتم تسوية الرصيد المستحق.
      </p>

      <SectionTitle>4. ملفات تعريف الارتباط والتخزين المحلي</SectionTitle>

      <SubTitle>4.1 ملفات تعريف الارتباط (Cookies)</SubTitle>
      <p>تستخدم المنصة ملفات تعريف الارتباط التالية:</p>
      <div className="my-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-gray-300">
              <th className="py-2 pr-4">الاسم</th>
              <th className="py-2 pr-4">النوع</th>
              <th className="py-2 pr-4">المدة</th>
              <th className="py-2">الغرض</th>
            </tr>
          </thead>
          <tbody className="text-gray-400">
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4 font-mono text-xs">admin_token</td>
              <td className="py-2 pr-4">HttpOnly, Secure</td>
              <td className="py-2 pr-4">7 أيام</td>
              <td className="py-2">مصادقة المسؤول</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4 font-mono text-xs">client_token</td>
              <td className="py-2 pr-4">HttpOnly, Secure</td>
              <td className="py-2 pr-4">30 يومًا</td>
              <td className="py-2">مصادقة العميل</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        جميع ملفات تعريف الارتباط ضرورية تمامًا لعمل الخدمة (المصادقة). نحن لا نستخدم ملفات تعريف ارتباط إعلانية أو
        تسويقية أو تحليلية من جهات خارجية.
      </p>

      <SubTitle>4.2 التخزين المحلي (localStorage)</SubTitle>
      <p>يستخدم ويدجت الذكاء الاصطناعي على موقع العميل localStorage في المتصفح لـ:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>
          <span className="font-mono text-xs text-gray-300">widget_messages_&#123;clientId&#125;</span> — حفظ سجل
          الدردشة لاستئناف الجلسة
        </li>
        <li>
          <span className="font-mono text-xs text-gray-300">widget_position_&#123;clientId&#125;</span> — موضع زر
          الويدجت على الصفحة
        </li>
        <li>
          <span className="font-mono text-xs text-gray-300">cookie_consent</span> — حالة قبول ملفات تعريف الارتباط على
          هذا الموقع
        </li>
      </ul>
      <p>يتم تخزين بيانات localStorage فقط في متصفح المستخدم ولا يتم إرسالها إلى الخادم.</p>

      <SectionTitle>5. كيف نستخدم البيانات</SectionTitle>
      <p>نستخدم البيانات المجمّعة لـ:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>تقديم ودعم خدمة مساعد الذكاء الاصطناعي</li>
        <li>معالجة طلبات المستخدمين وإنشاء ردود الذكاء الاصطناعي</li>
        <li>إدارة حسابات العملاء والاشتراكات</li>
        <li>التحليلات وتحسين جودة ردود الذكاء الاصطناعي</li>
        <li>معالجة المدفوعات وإصدار الفواتير</li>
        <li>الدعم التقني والأمان</li>
        <li>الامتثال للمتطلبات القانونية</li>
      </ul>

      <SubTitle>5.1 الأسس القانونية للمعالجة (المادة 6 من GDPR)</SubTitle>
      <div className="my-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-gray-300">
              <th className="py-2 pr-4">غرض المعالجة</th>
              <th className="py-2">الأساس القانوني</th>
            </tr>
          </thead>
          <tbody className="text-gray-400">
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">تقديم ودعم خدمة مساعد الذكاء الاصطناعي</td>
              <td className="py-2">تنفيذ العقد (Art. 6(1)(b))</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">معالجة الطلبات وإنشاء ردود الذكاء الاصطناعي</td>
              <td className="py-2">تنفيذ العقد (Art. 6(1)(b))</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">إدارة حسابات العملاء والاشتراكات</td>
              <td className="py-2">تنفيذ العقد (Art. 6(1)(b))</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">التحليلات وتحسين جودة ردود الذكاء الاصطناعي</td>
              <td className="py-2">المصلحة المشروعة (Art. 6(1)(f))</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">معالجة المدفوعات وإصدار الفواتير</td>
              <td className="py-2">تنفيذ العقد (Art. 6(1)(b))</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">الدعم التقني والأمان</td>
              <td className="py-2">المصلحة المشروعة (Art. 6(1)(f))</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">الامتثال للمتطلبات القانونية</td>
              <td className="py-2">الالتزام القانوني (Art. 6(1)(c))</td>
            </tr>
          </tbody>
        </table>
      </div>

      <SectionTitle>6. نقل البيانات إلى أطراف ثالثة</SectionTitle>
      <p>ننقل البيانات إلى أطراف ثالثة حصريًا لضمان عمل الخدمة. نحن لا نبيع أو ننقل البيانات لأغراض إعلانية.</p>

      <SubTitle>6.1 Google (Gemini API)</SubTitle>
      <p>
        لإنشاء ردود الذكاء الاصطناعي، ننقل نص رسائل المستخدم وسياق قاعدة المعرفة إلى Google Gemini API. تعالج Google
        البيانات وفقًا لسياسة الخصوصية الخاصة بها.
      </p>

      <SubTitle>6.2 Google Sheets API</SubTitle>
      <p>بناءً على طلب العميل، يمكن تصدير بيانات العملاء المحتملين إلى Google Sheets عبر حساب خدمة Google.</p>

      <SubTitle>6.3 تطبيقات المراسلة</SubTitle>
      <p>
        عند توصيل قنوات Telegram أو WhatsApp أو Instagram، يتم توجيه الرسائل عبر واجهات برمجة التطبيقات المقابلة
        (Telegram Bot API، WhatsApp Business API / WHAPI، Instagram Messaging API).
      </p>

      <SubTitle>6.4 مزودو خدمات الدفع</SubTitle>
      <p>
        لمعالجة المدفوعات، نستخدم WayForPay وCryptomus وNowPayments. أثناء الدفع، ننقل للمزود البريد الإلكتروني ورقم
        الهاتف ومبلغ الدفع. تتم معالجة بيانات البطاقة المصرفية مباشرةً من قبل مزود خدمة الدفع ولا تمر عبر خوادمنا.
      </p>

      <SectionTitle>7. فترات الاحتفاظ بالبيانات</SectionTitle>
      <div className="my-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-gray-300">
              <th className="py-2 pr-4">نوع البيانات</th>
              <th className="py-2 pr-4">فترة الاحتفاظ</th>
              <th className="py-2">الحذف</th>
            </tr>
          </thead>
          <tbody className="text-gray-400">
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">ملفات تعريف الارتباط (المصادقة)</td>
              <td className="py-2 pr-4">7–30 يومًا</td>
              <td className="py-2">تلقائيًا</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">سجل التدقيق</td>
              <td className="py-2 pr-4">90 يومًا</td>
              <td className="py-2">تلقائيًا (TTL)</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">سجل الدردشة</td>
              <td className="py-2 pr-4">حتى حذف الحساب</td>
              <td className="py-2">بناءً على الطلب أو عند حذف الحساب</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">بيانات العملاء المحتملين</td>
              <td className="py-2 pr-4">حتى حذف الحساب</td>
              <td className="py-2">بناءً على طلب العميل</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">بيانات الحساب</td>
              <td className="py-2 pr-4">حتى حذف الحساب</td>
              <td className="py-2">بناءً على الطلب</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">الفواتير والمدفوعات</td>
              <td className="py-2 pr-4">وفقًا لمتطلبات القانون</td>
              <td className="py-2">خلال الفترات المحددة قانونيًا</td>
            </tr>
          </tbody>
        </table>
      </div>

      <SectionTitle>8. حقوقك</SectionTitle>
      <p>وفقًا للائحة GDPR والقانون الأوكراني، لديك الحق في:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>
          <strong className="text-gray-300">الوصول</strong> — طلب نسخة من بياناتك الشخصية
        </li>
        <li>
          <strong className="text-gray-300">التصحيح</strong> — المطالبة بتصحيح البيانات غير الدقيقة
        </li>
        <li>
          <strong className="text-gray-300">الحذف</strong> — المطالبة بحذف بياناتك
        </li>
        <li>
          <strong className="text-gray-300">قابلية النقل</strong> — الحصول على البيانات بتنسيق قابل للقراءة آليًا
        </li>
        <li>
          <strong className="text-gray-300">سحب الموافقة</strong> — سحب الموافقة على معالجة البيانات في أي وقت
        </li>
        <li>
          <strong className="text-gray-300">تقييد المعالجة</strong> — المطالبة بتقييد المعالجة في ظروف معينة
        </li>
      </ul>
      <p>
        لممارسة حقوقك، تواصل معنا:{' '}
        <a href="mailto:winbix.ai@gmail.com" className="text-[var(--neon-cyan)] hover:underline">
          winbix.ai@gmail.com
        </a>
      </p>

      <SectionTitle>9. الصفحات التجريبية</SectionTitle>
      <p>
        توفر المنصة صفحات تجريبية يتم فيها عرض موقع العميل المحتمل في iframe إلى جانب ويدجت الذكاء الاصطناعي الخاص بنا.
        يتم ذلك حصريًا لأغراض المعاينة.
      </p>
      <p>في الصفحات التجريبية:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>لا نجمع بيانات إضافية من الموقع المعروض</li>
        <li>لا نعدل محتوى موقع العميل</li>
        <li>يتم استخدام البيانات المتاحة للعامة فقط</li>
        <li>يتم إنشاء العرض التجريبي لأغراض التعريف ويمكن إزالته بناءً على طلب مالك الموقع</li>
      </ul>

      <SectionTitle>10. أمان البيانات</SectionTitle>
      <p>نتخذ التدابير التالية:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>علامات HttpOnly وSecure لملفات تعريف الارتباط</li>
        <li>حماية SameSite=Lax ضد هجمات CSRF</li>
        <li>تحديد معدل الطلبات (Rate limiting)</li>
        <li>تشفير TLS/HTTPS</li>
        <li>المصادقة من جانب الخادم</li>
        <li>تسجيل التدقيق لجميع الإجراءات الحرجة</li>
      </ul>

      <SectionTitle>11. التغييرات في السياسة</SectionTitle>
      <p>
        نحتفظ بالحق في تحديث سياسة الخصوصية هذه. في حالة إجراء تغييرات جوهرية، سنقوم بإخطارك عبر المنصة أو عبر البريد
        الإلكتروني. يُشار إلى تاريخ آخر تحديث في بداية المستند.
      </p>

      <SectionTitle>12. معلومات الاتصال</SectionTitle>
      <ul className="ml-6 list-disc space-y-1">
        <li>
          البريد الإلكتروني:{' '}
          <a href="mailto:winbix.ai@gmail.com" className="text-[var(--neon-cyan)] hover:underline">
            winbix.ai@gmail.com
          </a>
        </li>
        <li>
          Telegram:{' '}
          <a
            href="https://t.me/winbix_ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--neon-cyan)] hover:underline"
          >
            @winbix_ai
          </a>
        </li>
      </ul>
    </>
  );
}

/* ─────────────────────────── MAIN COMPONENT ─────────────────────────── */

const CONTENT_MAP: Record<string, () => React.JSX.Element> = {
  ru: RuContent,
  en: EnContent,
  uk: UkContent,
  pl: PlContent,
  ar: ArContent,
};

export default function PrivacyContent() {
  const { lang } = useLanguage();
  const { t: tc } = useTranslation('common');
  const Content = CONTENT_MAP[lang] || RuContent;

  const titles: Record<string, [string, string]> = {
    ru: ['Политика ', 'конфиденциальности'],
    en: ['Privacy ', 'Policy'],
    uk: ['Політика ', 'конфіденційності'],
    pl: ['Polityka ', 'prywatności'],
    ar: ['سياسة ', 'الخصوصية'],
  };
  const [titleBefore, titleAccent] = titles[lang] || titles.ru;

  const lastUpdated: Record<string, string> = {
    ru: 'Последнее обновление: 14 февраля 2026 г.',
    en: 'Last updated: February 14, 2026',
    uk: 'Останнє оновлення: 14 лютого 2026 р.',
    pl: 'Ostatnia aktualizacja: 14 lutego 2026 r.',
    ar: 'آخر تحديث: 14 فبراير 2026',
  };

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
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link
            href="/"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-gray-300 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
          >
            {tc('nav.home')}
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-3xl px-6 pt-8 pb-24">
        <h1 className="mb-2 text-4xl font-bold text-white md:text-5xl">
          {titleBefore}
          <span className="gradient-text">{titleAccent}</span>
        </h1>
        <p className="mb-8 text-sm text-gray-500">{lastUpdated[lang] || lastUpdated.ru}</p>

        <div className="space-y-4 text-base leading-relaxed text-gray-400">
          <Content />
        </div>

        {/* Footer */}
        <div className="glow-line mt-16 mb-8 h-px" />
        <footer className="flex flex-col items-center justify-between gap-4 text-sm text-gray-600 md:flex-row">
          <p>
            &copy; {new Date().getFullYear()} WinBix AI. {tc('footer.rights')}
          </p>
          <div className="flex gap-6">
            <Link href="/terms" className="text-gray-500 transition-colors hover:text-gray-300">
              {tc('footer.terms')}
            </Link>
            <Link href="/" className="text-gray-500 transition-colors hover:text-gray-300">
              {tc('footer.home')}
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
