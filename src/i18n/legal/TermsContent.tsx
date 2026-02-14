'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/i18n/context';
import { useTranslation } from '@/i18n/useTranslation';
import LanguageSwitcher from '@/components/LanguageSwitcher';

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-12 mb-4 text-2xl font-bold text-white">{children}</h2>;
}

/* ───────────────────────────── RUSSIAN ───────────────────────────── */

function RuContent() {
  return (
    <>
      <SectionTitle>1. Общие положения</SectionTitle>
      <p>
        Настоящие Условия использования (далее — «Условия») регулируют отношения между{' '}
        <span className="text-white">WinBix AI</span> (далее — «Компания», «мы») и лицом, использующим Платформу (далее
        — «Пользователь», «Клиент», «вы»).
      </p>
      <p>
        Используя Платформу, вы подтверждаете, что прочитали, поняли и согласны с данными Условиями. Если вы не согласны
        с каким-либо положением, пожалуйста, прекратите использование Платформы.
      </p>

      <SectionTitle>2. Описание сервиса</SectionTitle>
      <p>
        <span className="text-white">WinBix AI</span> — это SaaS-платформа, предоставляющая AI-чат-виджеты для
        бизнес-сайтов. Платформа включает:
      </p>
      <ul className="ml-6 list-disc space-y-1">
        <li>
          <span className="text-white">AI-ассистент</span> — интеллектуальный чат-виджет, встраиваемый на сайт клиента
          для автоматической обработки обращений посетителей
        </li>
        <li>
          <span className="text-white">База знаний</span> — система хранения и поиска бизнес-информации для генерации
          точных ответов
        </li>
        <li>
          <span className="text-white">Многоканальная интеграция</span> — подключение Telegram, WhatsApp и Instagram для
          обработки обращений из различных каналов
        </li>
        <li>
          <span className="text-white">Аналитика</span> — дашборд со статистикой обращений, эффективности AI и метриками
          удовлетворённости пользователей
        </li>
        <li>
          <span className="text-white">Кабинет клиента</span> — интерфейс для настройки виджета, управления знаниями,
          просмотра истории и оплаты
        </li>
      </ul>

      <SectionTitle>3. Демонстрационные виджеты</SectionTitle>
      <p>Компания создаёт демонстрационные версии AI-виджетов для потенциальных клиентов в целях предпросмотра.</p>
      <p>При создании демо-виджетов:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>Используем только публично доступную информацию с сайта клиента</li>
        <li>Сайт отображается в iframe исключительно для предпросмотра</li>
        <li>Мы не копируем и не модифицируем контент сайта</li>
        <li>Демо предназначено только для визуальной презентации</li>
        <li>По запросу демо-виджет будет немедленно удалён</li>
        <li>Демо-виджеты не собирают персональные данные до заключения договора</li>
      </ul>

      <SectionTitle>4. Регистрация и доступ</SectionTitle>
      <p>
        Доступ к Платформе осуществляется через уникальный <span className="text-white">токен доступа</span>. Клиент
        несёт ответственность за сохранность своего токена.
      </p>
      <p>Обязанности клиента:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>Предоставлять достоверную информацию</li>
        <li>Своевременно обновлять данные аккаунта</li>
        <li>Обеспечивать безопасность токена доступа</li>
        <li>Немедленно уведомлять о несанкционированном доступе</li>
      </ul>

      <SectionTitle>5. Допустимое использование</SectionTitle>
      <p>Запрещено:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>Размещение незаконного, оскорбительного или вредоносного контента</li>
        <li>Несанкционированный доступ к системам Платформы</li>
        <li>Обратная разработка (reverse engineering) программного обеспечения</li>
        <li>Чрезмерная автоматическая нагрузка на системы</li>
        <li>Нарушение прав интеллектуальной собственности</li>
        <li>Перепродажа или сублицензирование без согласия Компании</li>
      </ul>

      <SectionTitle>6. Интеллектуальная собственность</SectionTitle>
      <ul className="ml-6 list-disc space-y-1">
        <li>
          <span className="text-white">Платформа</span> — программное обеспечение, дизайн, код и алгоритмы принадлежат
          WinBix AI
        </li>
        <li>
          <span className="text-white">Контент клиента</span> — данные, загруженные клиентом, остаются собственностью
          клиента
        </li>
        <li>
          <span className="text-white">AI-ответы</span> — предоставляются «как есть». Компания не несёт ответственности
          за их точность
        </li>
      </ul>

      <SectionTitle>7. Тарифы и оплата</SectionTitle>
      <ul className="ml-6 list-disc space-y-1">
        <li>
          <span className="text-white">Подписка</span> — ежемесячная или предоплата за 3/6/12 месяцев
        </li>
        <li>
          <span className="text-white">Стоимость AI</span> — основана на фактическом потреблении токенов AI-модели
        </li>
        <li>
          <span className="text-white">Дополнительные кредиты</span> — доступны при превышении лимита
        </li>
        <li>
          <span className="text-white">Блокировка</span> — виджет может быть приостановлен при достижении порога $40/мес
        </li>
      </ul>
      <p>Оплата через WayForPay, Cryptomus, NowPayments. Возврат средств определяется индивидуально.</p>

      <SectionTitle>8. Обработка данных</SectionTitle>
      <p>
        Обработка данных осуществляется в соответствии с нашей{' '}
        <Link href="/privacy" className="text-white underline hover:text-gray-300">
          Политикой конфиденциальности
        </Link>
        .
      </p>
      <p>
        Клиент является <span className="text-white">контроллером данных</span>. Компания выступает{' '}
        <span className="text-white">процессором данных</span>.
      </p>

      <SectionTitle>9. Доступность сервиса</SectionTitle>
      <p>
        Мы прилагаем коммерчески разумные усилия для обеспечения работы Платформы. Мы не гарантируем 100% доступность.
      </p>
      <p>Мы не несём ответственности за:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>Плановые технические работы (с предварительным уведомлением)</li>
        <li>Сбои сторонних сервисов</li>
        <li>Обстоятельства непреодолимой силы (форс-мажор)</li>
      </ul>

      <SectionTitle>10. Ограничение ответственности</SectionTitle>
      <p>В максимальной степени, допускаемой законодательством:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>Платформа предоставляется «как есть» без каких-либо гарантий</li>
        <li>Компания не несёт ответственности за косвенные, случайные или штрафные убытки</li>
        <li>Компания не отвечает за ответы, сгенерированные AI</li>
        <li>Совокупная ответственность ограничена суммами, уплаченными за последние 3 месяца</li>
      </ul>

      <SectionTitle>11. Прекращение использования</SectionTitle>
      <p>Клиент может прекратить использование в любое время. При прекращении:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>Виджет деактивируется</li>
        <li>Данные удаляются в течение 30 дней</li>
        <li>Клиент может запросить экспорт данных</li>
      </ul>
      <p>
        Компания оставляет за собой право приостановить или прекратить доступ за нарушения, неуплату или по иным
        законным основаниям.
      </p>

      <SectionTitle>12. Применимое право</SectionTitle>
      <p>
        Настоящие Условия регулируются законодательством <span className="text-white">Украины</span>. Споры разрешаются
        путём переговоров, а при невозможности — в компетентных судах Украины.
      </p>

      <SectionTitle>13. Изменения условий</SectionTitle>
      <p>
        Мы оставляем за собой право обновлять данные Условия. При существенных изменениях мы уведомим пользователей
        заблаговременно.
      </p>

      <SectionTitle>14. Контактная информация</SectionTitle>
      <p>
        Email:{' '}
        <a href="mailto:winbix.ai@gmail.com" className="text-white underline hover:text-gray-300">
          winbix.ai@gmail.com
        </a>
      </p>
      <p>
        Telegram:{' '}
        <a
          href="https://t.me/winbix_ai"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white underline hover:text-gray-300"
        >
          @winbix_ai
        </a>
      </p>
    </>
  );
}

/* ───────────────────────────── ENGLISH ───────────────────────────── */

function EnContent() {
  return (
    <>
      <SectionTitle>1. General Provisions</SectionTitle>
      <p>
        These Terms of Service (hereinafter &quot;Terms&quot;) govern the relationship between{' '}
        <span className="text-white">WinBix AI</span> (hereinafter &quot;Company&quot;, &quot;we&quot;) and the person
        using the Platform (hereinafter &quot;User&quot;, &quot;Client&quot;, &quot;you&quot;).
      </p>
      <p>
        By using the Platform, you confirm that you have read, understood, and agree to these Terms. If you disagree
        with any provision, please discontinue use of the Platform.
      </p>

      <SectionTitle>2. Service Description</SectionTitle>
      <p>
        <span className="text-white">WinBix AI</span> is a SaaS platform providing AI chat widgets for business
        websites. The Platform includes:
      </p>
      <ul className="ml-6 list-disc space-y-1">
        <li>
          <span className="text-white">AI Assistant</span> — an intelligent chat widget embedded on the client&apos;s
          website for automatic handling of visitor inquiries
        </li>
        <li>
          <span className="text-white">Knowledge Base</span> — a system for storing and retrieving business information
          to generate accurate responses
        </li>
        <li>
          <span className="text-white">Multi-channel Integration</span> — connecting Telegram, WhatsApp, and Instagram
          for processing inquiries from different channels
        </li>
        <li>
          <span className="text-white">Analytics</span> — a dashboard with inquiry statistics, AI performance, and user
          satisfaction metrics
        </li>
        <li>
          <span className="text-white">Client Dashboard</span> — an interface for widget configuration, knowledge
          management, history review, and payment
        </li>
      </ul>

      <SectionTitle>3. Demo Widgets</SectionTitle>
      <p>The Company creates demo versions of AI widgets for potential clients for preview purposes.</p>
      <p>When creating demos:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>We use only publicly available information from the client&apos;s website</li>
        <li>Website is displayed in iframe for preview only</li>
        <li>We do not copy or modify website content</li>
        <li>Demo is for visual presentation purposes only</li>
        <li>Upon request, the demo widget will be immediately removed</li>
        <li>Demo widgets do not collect personal data before contract signing</li>
      </ul>

      <SectionTitle>4. Registration and Access</SectionTitle>
      <p>
        Access to the Platform is provided via a unique <span className="text-white">access token</span>. The Client is
        responsible for token security.
      </p>
      <p>Client obligations:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>Provide accurate information</li>
        <li>Update account data in a timely manner</li>
        <li>Keep the access token secure</li>
        <li>Immediately notify of unauthorized access</li>
      </ul>

      <SectionTitle>5. Acceptable Use</SectionTitle>
      <p>Prohibited:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>Posting illegal, offensive, or harmful content</li>
        <li>Unauthorized access to Platform systems</li>
        <li>Reverse engineering of the software</li>
        <li>Excessive automated load on systems</li>
        <li>Violation of intellectual property rights</li>
        <li>Reselling or sublicensing without Company consent</li>
      </ul>

      <SectionTitle>6. Intellectual Property</SectionTitle>
      <ul className="ml-6 list-disc space-y-1">
        <li>
          <span className="text-white">Platform</span> — software, design, code, and algorithms belong to WinBix AI
        </li>
        <li>
          <span className="text-white">Client Content</span> — data uploaded by the client remains the client&apos;s
          property
        </li>
        <li>
          <span className="text-white">AI Responses</span> — provided &quot;as is&quot;. The Company is not responsible
          for their accuracy
        </li>
      </ul>

      <SectionTitle>7. Pricing and Payment</SectionTitle>
      <ul className="ml-6 list-disc space-y-1">
        <li>
          <span className="text-white">Subscription</span> — monthly or prepaid for 3/6/12 months
        </li>
        <li>
          <span className="text-white">AI Cost</span> — based on actual AI model token consumption
        </li>
        <li>
          <span className="text-white">Additional Credits</span> — available when the limit is exceeded
        </li>
        <li>
          <span className="text-white">Blocking</span> — widget may be suspended at the $40/month threshold
        </li>
      </ul>
      <p>Payment via WayForPay, Cryptomus, NowPayments. Refunds are determined on an individual basis.</p>

      <SectionTitle>8. Data Processing</SectionTitle>
      <p>
        Data processing is carried out in accordance with our{' '}
        <Link href="/privacy" className="text-white underline hover:text-gray-300">
          Privacy Policy
        </Link>
        .
      </p>
      <p>
        The Client is the <span className="text-white">data controller</span>. The Company acts as the{' '}
        <span className="text-white">data processor</span>.
      </p>

      <SectionTitle>9. Service Availability</SectionTitle>
      <p>
        We make commercially reasonable efforts to ensure Platform operation. We do not guarantee 100% availability.
      </p>
      <p>We are not responsible for:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>Scheduled maintenance (with prior notice)</li>
        <li>Third-party service disruptions</li>
        <li>Force majeure circumstances</li>
      </ul>

      <SectionTitle>10. Limitation of Liability</SectionTitle>
      <p>To the maximum extent permitted by law:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>The Platform is provided &quot;as is&quot; without any warranties</li>
        <li>The Company is not liable for indirect, incidental, or punitive damages</li>
        <li>The Company is not responsible for AI-generated responses</li>
        <li>Aggregate liability is limited to amounts paid in the last 3 months</li>
      </ul>

      <SectionTitle>11. Termination</SectionTitle>
      <p>The Client may terminate use at any time. Upon termination:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>Widget is deactivated</li>
        <li>Data is deleted within 30 days</li>
        <li>Client may request data export</li>
      </ul>
      <p>
        The Company reserves the right to suspend or terminate access for violations, non-payment, or other lawful
        grounds.
      </p>

      <SectionTitle>12. Governing Law</SectionTitle>
      <p>
        These Terms are governed by the laws of <span className="text-white">Ukraine</span>. Disputes shall be resolved
        through negotiation, and if not possible, in the competent courts of Ukraine.
      </p>

      <SectionTitle>13. Changes to Terms</SectionTitle>
      <p>We reserve the right to update these Terms. We will notify users in advance of any significant changes.</p>

      <SectionTitle>14. Contact Information</SectionTitle>
      <p>
        Email:{' '}
        <a href="mailto:winbix.ai@gmail.com" className="text-white underline hover:text-gray-300">
          winbix.ai@gmail.com
        </a>
      </p>
      <p>
        Telegram:{' '}
        <a
          href="https://t.me/winbix_ai"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white underline hover:text-gray-300"
        >
          @winbix_ai
        </a>
      </p>
    </>
  );
}

/* ──────────────────────────── UKRAINIAN ──────────────────────────── */

function UkContent() {
  return (
    <>
      <SectionTitle>1. Загальні положення</SectionTitle>
      <p>
        Ці Умови використання (далі — «Умови») регулюють відносини між <span className="text-white">WinBix AI</span>{' '}
        (далі — «Компанія», «ми») та особою, що використовує Платформу (далі — «Користувач», «Клієнт», «ви»).
      </p>
      <p>
        Використовуючи Платформу, ви підтверджуєте, що прочитали, зрозуміли та погоджуєтесь з цими Умовами. Якщо ви не
        згодні з будь-яким положенням, будь ласка, припиніть використання Платформи.
      </p>

      <SectionTitle>2. Опис сервісу</SectionTitle>
      <p>
        <span className="text-white">WinBix AI</span> — це SaaS-платформа, що надає AI-чат-віджети для бізнес-сайтів.
        Платформа включає:
      </p>
      <ul className="ml-6 list-disc space-y-1">
        <li>
          <span className="text-white">AI-асистент</span> — інтелектуальний чат-віджет, що вбудовується на сайт клієнта
          для автоматичної обробки звернень відвідувачів
        </li>
        <li>
          <span className="text-white">База знань</span> — система зберігання та пошуку бізнес-інформації для генерації
          точних відповідей
        </li>
        <li>
          <span className="text-white">Багатоканальна інтеграція</span> — підключення Telegram, WhatsApp та Instagram
          для обробки звернень з різних каналів
        </li>
        <li>
          <span className="text-white">Аналітика</span> — дашборд зі статистикою звернень, ефективності AI та метриками
          задоволеності користувачів
        </li>
        <li>
          <span className="text-white">Кабінет клієнта</span> — інтерфейс для налаштування віджета, управління знаннями,
          перегляду історії та оплати
        </li>
      </ul>

      <SectionTitle>3. Демонстраційні віджети</SectionTitle>
      <p>Компанія створює демонстраційні версії AI-віджетів для потенційних клієнтів з метою попереднього перегляду.</p>
      <p>При створенні демо-віджетів:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>Використовуємо тільки публічно доступну інформацію з сайту клієнта</li>
        <li>Сайт відображається в iframe виключно для попереднього перегляду</li>
        <li>Ми не копіюємо та не модифікуємо контент сайту</li>
        <li>Демо призначене тільки для візуальної презентації</li>
        <li>За запитом демо-віджет буде негайно видалено</li>
        <li>Демо-віджети не збирають персональні дані до укладення договору</li>
      </ul>

      <SectionTitle>4. Реєстрація та доступ</SectionTitle>
      <p>
        Доступ до Платформи здійснюється через унікальний <span className="text-white">токен доступу</span>. Клієнт несе
        відповідальність за збереження свого токена.
      </p>
      <p>Обов&apos;язки клієнта:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>Надавати достовірну інформацію</li>
        <li>Своєчасно оновлювати дані акаунту</li>
        <li>Забезпечувати безпеку токена доступу</li>
        <li>Негайно повідомляти про несанкціонований доступ</li>
      </ul>

      <SectionTitle>5. Допустиме використання</SectionTitle>
      <p>Заборонено:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>Розміщення незаконного, образливого або шкідливого контенту</li>
        <li>Несанкціонований доступ до систем Платформи</li>
        <li>Зворотна розробка (reverse engineering) програмного забезпечення</li>
        <li>Надмірне автоматичне навантаження на системи</li>
        <li>Порушення прав інтелектуальної власності</li>
        <li>Перепродаж або субліцензування без згоди Компанії</li>
      </ul>

      <SectionTitle>6. Інтелектуальна власність</SectionTitle>
      <ul className="ml-6 list-disc space-y-1">
        <li>
          <span className="text-white">Платформа</span> — програмне забезпечення, дизайн, код та алгоритми належать
          WinBix AI
        </li>
        <li>
          <span className="text-white">Контент клієнта</span> — дані, завантажені клієнтом, залишаються власністю
          клієнта
        </li>
        <li>
          <span className="text-white">AI-відповіді</span> — надаються «як є». Компанія не несе відповідальності за їх
          точність
        </li>
      </ul>

      <SectionTitle>7. Тарифи та оплата</SectionTitle>
      <ul className="ml-6 list-disc space-y-1">
        <li>
          <span className="text-white">Підписка</span> — щомісячна або передоплата за 3/6/12 місяців
        </li>
        <li>
          <span className="text-white">Вартість AI</span> — базується на фактичному споживанні токенів AI-моделі
        </li>
        <li>
          <span className="text-white">Додаткові кредити</span> — доступні при перевищенні ліміту
        </li>
        <li>
          <span className="text-white">Блокування</span> — віджет може бути призупинено при досягненні порогу $40/міс
        </li>
      </ul>
      <p>Оплата через WayForPay, Cryptomus, NowPayments. Повернення коштів визначається індивідуально.</p>

      <SectionTitle>8. Обробка даних</SectionTitle>
      <p>
        Обробка даних здійснюється відповідно до нашої{' '}
        <Link href="/privacy" className="text-white underline hover:text-gray-300">
          Політики конфіденційності
        </Link>
        .
      </p>
      <p>
        Клієнт є <span className="text-white">контролером даних</span>. Компанія виступає{' '}
        <span className="text-white">процесором даних</span>.
      </p>

      <SectionTitle>9. Доступність сервісу</SectionTitle>
      <p>
        Ми докладаємо комерційно обґрунтованих зусиль для забезпечення роботи Платформи. Ми не гарантуємо 100%
        доступність.
      </p>
      <p>Ми не несемо відповідальності за:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>Планові технічні роботи (з попереднім повідомленням)</li>
        <li>Збої сторонніх сервісів</li>
        <li>Обставини непереборної сили (форс-мажор)</li>
      </ul>

      <SectionTitle>10. Обмеження відповідальності</SectionTitle>
      <p>У максимальному ступені, що допускається законодавством:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>Платформа надається «як є» без будь-яких гарантій</li>
        <li>Компанія не несе відповідальності за непрямі, випадкові або штрафні збитки</li>
        <li>Компанія не відповідає за відповіді, згенеровані AI</li>
        <li>Сукупна відповідальність обмежена сумами, сплаченими за останні 3 місяці</li>
      </ul>

      <SectionTitle>11. Припинення використання</SectionTitle>
      <p>Клієнт може припинити використання в будь-який час. При припиненні:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>Віджет деактивується</li>
        <li>Дані видаляються протягом 30 днів</li>
        <li>Клієнт може запросити експорт даних</li>
      </ul>
      <p>
        Компанія залишає за собою право призупинити або припинити доступ за порушення, несплату або з інших законних
        підстав.
      </p>

      <SectionTitle>12. Застосовне право</SectionTitle>
      <p>
        Ці Умови регулюються законодавством <span className="text-white">України</span>. Спори вирішуються шляхом
        переговорів, а за неможливості — у компетентних судах України.
      </p>

      <SectionTitle>13. Зміни умов</SectionTitle>
      <p>Ми залишаємо за собою право оновлювати ці Умови. При суттєвих змінах ми повідомимо користувачів завчасно.</p>

      <SectionTitle>14. Контактна інформація</SectionTitle>
      <p>
        Email:{' '}
        <a href="mailto:winbix.ai@gmail.com" className="text-white underline hover:text-gray-300">
          winbix.ai@gmail.com
        </a>
      </p>
      <p>
        Telegram:{' '}
        <a
          href="https://t.me/winbix_ai"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white underline hover:text-gray-300"
        >
          @winbix_ai
        </a>
      </p>
    </>
  );
}

/* ──────────────────────────── POLISH ─────────────────────────────── */

function PlContent() {
  return (
    <>
      <SectionTitle>1. Postanowienia og&oacute;lne</SectionTitle>
      <p>
        Niniejsze Warunki korzystania (dalej — &quot;Warunki&quot;) regulują stosunki między{' '}
        <span className="text-white">WinBix AI</span> (dalej — &quot;Firma&quot;, &quot;my&quot;) a osobą korzystającą z
        Platformy (dalej — &quot;Użytkownik&quot;, &quot;Klient&quot;, &quot;Ty&quot;).
      </p>
      <p>
        Korzystając z Platformy, potwierdzasz, że przeczytałeś, zrozumiałeś i zgadzasz się z niniejszymi Warunkami.
        Jeśli nie zgadzasz się z jakimkolwiek postanowieniem, prosimy o zaprzestanie korzystania z Platformy.
      </p>

      <SectionTitle>2. Opis usługi</SectionTitle>
      <p>
        <span className="text-white">WinBix AI</span> to platforma SaaS dostarczająca widżety czatu AI dla stron
        internetowych firm. Platforma obejmuje:
      </p>
      <ul className="ml-6 list-disc space-y-1">
        <li>
          <span className="text-white">Asystent AI</span> — inteligentny widżet czatu osadzony na stronie klienta do
          automatycznej obsługi zapytań odwiedzających
        </li>
        <li>
          <span className="text-white">Baza wiedzy</span> — system przechowywania i wyszukiwania informacji biznesowych
          w celu generowania precyzyjnych odpowiedzi
        </li>
        <li>
          <span className="text-white">Integracja wielokanałowa</span> — podłączenie Telegram, WhatsApp i Instagram do
          przetwarzania zapytań z różnych kanałów
        </li>
        <li>
          <span className="text-white">Analityka</span> — panel ze statystykami zapytań, wydajnością AI i wskaźnikami
          satysfakcji użytkowników
        </li>
        <li>
          <span className="text-white">Panel klienta</span> — interfejs do konfiguracji widżetu, zarządzania wiedzą,
          przeglądania historii i płatności
        </li>
      </ul>

      <SectionTitle>3. Widżety demonstracyjne</SectionTitle>
      <p>Firma tworzy wersje demonstracyjne widżetów AI dla potencjalnych klientów w celach poglądowych.</p>
      <p>Podczas tworzenia wersji demo:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>Wykorzystujemy wyłącznie publicznie dostępne informacje ze strony klienta</li>
        <li>Strona wyświetlana jest w iframe wyłącznie w celach poglądowych</li>
        <li>Nie kopiujemy ani nie modyfikujemy treści strony</li>
        <li>Demo służy wyłącznie do prezentacji wizualnej</li>
        <li>Na żądanie widżet demo zostanie natychmiast usunięty</li>
        <li>Widżety demo nie zbierają danych osobowych przed podpisaniem umowy</li>
      </ul>

      <SectionTitle>4. Rejestracja i dostęp</SectionTitle>
      <p>
        Dostęp do Platformy odbywa się za pomocą unikalnego <span className="text-white">tokena dostępu</span>. Klient
        ponosi odpowiedzialność za bezpieczeństwo tokena.
      </p>
      <p>Obowiązki klienta:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>Podawanie prawdziwych informacji</li>
        <li>Terminowe aktualizowanie danych konta</li>
        <li>Zapewnienie bezpieczeństwa tokena dostępu</li>
        <li>Natychmiastowe powiadamianie o nieautoryzowanym dostępie</li>
      </ul>

      <SectionTitle>5. Dopuszczalne użytkowanie</SectionTitle>
      <p>Zabronione jest:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>Publikowanie nielegalnych, obraźliwych lub szkodliwych treści</li>
        <li>Nieautoryzowany dostęp do systemów Platformy</li>
        <li>Inżynieria wsteczna (reverse engineering) oprogramowania</li>
        <li>Nadmierne automatyczne obciążanie systemów</li>
        <li>Naruszanie praw własności intelektualnej</li>
        <li>Odsprzedaż lub sublicencjonowanie bez zgody Firmy</li>
      </ul>

      <SectionTitle>6. Własność intelektualna</SectionTitle>
      <ul className="ml-6 list-disc space-y-1">
        <li>
          <span className="text-white">Platforma</span> — oprogramowanie, projekt, kod i algorytmy należą do WinBix AI
        </li>
        <li>
          <span className="text-white">Treści klienta</span> — dane przesłane przez klienta pozostają własnością klienta
        </li>
        <li>
          <span className="text-white">Odpowiedzi AI</span> — dostarczane &quot;tak jak są&quot;. Firma nie ponosi
          odpowiedzialności za ich dokładność
        </li>
      </ul>

      <SectionTitle>7. Cennik i płatności</SectionTitle>
      <ul className="ml-6 list-disc space-y-1">
        <li>
          <span className="text-white">Subskrypcja</span> — miesięczna lub przedpłata za 3/6/12 miesięcy
        </li>
        <li>
          <span className="text-white">Koszt AI</span> — oparty na rzeczywistym zużyciu tokenów modelu AI
        </li>
        <li>
          <span className="text-white">Dodatkowe kredyty</span> — dostępne po przekroczeniu limitu
        </li>
        <li>
          <span className="text-white">Blokada</span> — widżet może zostać zawieszony po osiągnięciu progu 40$/mies.
        </li>
      </ul>
      <p>Płatności przez WayForPay, Cryptomus, NowPayments. Zwroty rozpatrywane są indywidualnie.</p>

      <SectionTitle>8. Przetwarzanie danych</SectionTitle>
      <p>
        Przetwarzanie danych odbywa się zgodnie z naszą{' '}
        <Link href="/privacy" className="text-white underline hover:text-gray-300">
          Polityką prywatności
        </Link>
        .
      </p>
      <p>
        Klient jest <span className="text-white">administratorem danych</span>. Firma pełni rolę{' '}
        <span className="text-white">podmiotu przetwarzającego dane</span>.
      </p>

      <SectionTitle>9. Dostępność usługi</SectionTitle>
      <p>
        Dokładamy wszelkich uzasadnionych komercyjnie starań w celu zapewnienia działania Platformy. Nie gwarantujemy
        100% dostępności.
      </p>
      <p>Nie ponosimy odpowiedzialności za:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>Zaplanowane prace konserwacyjne (z wcześniejszym powiadomieniem)</li>
        <li>Zakłócenia usług stron trzecich</li>
        <li>Okoliczności siły wyższej (force majeure)</li>
      </ul>

      <SectionTitle>10. Ograniczenie odpowiedzialności</SectionTitle>
      <p>W maksymalnym zakresie dozwolonym przez prawo:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>Platforma jest dostarczana &quot;tak jak jest&quot; bez żadnych gwarancji</li>
        <li>Firma nie ponosi odpowiedzialności za szkody pośrednie, przypadkowe lub karne</li>
        <li>Firma nie odpowiada za odpowiedzi generowane przez AI</li>
        <li>Łączna odpowiedzialność jest ograniczona do kwot wpłaconych w ciągu ostatnich 3 miesięcy</li>
      </ul>

      <SectionTitle>11. Rozwiązanie umowy</SectionTitle>
      <p>Klient może zaprzestać korzystania w dowolnym momencie. Po zakończeniu:</p>
      <ul className="ml-6 list-disc space-y-1">
        <li>Widżet zostaje dezaktywowany</li>
        <li>Dane zostaną usunięte w ciągu 30 dni</li>
        <li>Klient może zażądać eksportu danych</li>
      </ul>
      <p>
        Firma zastrzega sobie prawo do zawieszenia lub zakończenia dostępu z powodu naruszeń, braku płatności lub z
        innych prawnie uzasadnionych podstaw.
      </p>

      <SectionTitle>12. Prawo właściwe</SectionTitle>
      <p>
        Niniejsze Warunki podlegają prawu <span className="text-white">Ukrainy</span>. Spory rozstrzygane są w drodze
        negocjacji, a w razie niemożności — przez właściwe sądy Ukrainy.
      </p>

      <SectionTitle>13. Zmiany warunków</SectionTitle>
      <p>
        Zastrzegamy sobie prawo do aktualizacji niniejszych Warunków. O istotnych zmianach powiadomimy użytkowników z
        wyprzedzeniem.
      </p>

      <SectionTitle>14. Dane kontaktowe</SectionTitle>
      <p>
        Email:{' '}
        <a href="mailto:winbix.ai@gmail.com" className="text-white underline hover:text-gray-300">
          winbix.ai@gmail.com
        </a>
      </p>
      <p>
        Telegram:{' '}
        <a
          href="https://t.me/winbix_ai"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white underline hover:text-gray-300"
        >
          @winbix_ai
        </a>
      </p>
    </>
  );
}

/* ──────────────────────────── ARABIC ─────────────────────────────── */

function ArContent() {
  return (
    <>
      <SectionTitle>1. أحكام عامة</SectionTitle>
      <p>
        تنظم شروط الاستخدام هذه (يُشار إليها فيما بعد بـ &quot;الشروط&quot;) العلاقة بين{' '}
        <span className="text-white">WinBix AI</span> (يُشار إليها فيما بعد بـ &quot;الشركة&quot;، &quot;نحن&quot;)
        والشخص الذي يستخدم المنصة (يُشار إليه فيما بعد بـ &quot;المستخدم&quot;، &quot;العميل&quot;، &quot;أنت&quot;).
      </p>
      <p>
        باستخدام المنصة، فإنك تؤكد أنك قد قرأت وفهمت ووافقت على هذه الشروط. إذا كنت لا توافق على أي بند، يرجى التوقف عن
        استخدام المنصة.
      </p>

      <SectionTitle>2. وصف الخدمة</SectionTitle>
      <p>
        <span className="text-white">WinBix AI</span> هي منصة SaaS توفر أدوات دردشة AI لمواقع الأعمال التجارية. تشمل
        المنصة:
      </p>
      <ul className="mr-6 list-disc space-y-1">
        <li>
          <span className="text-white">مساعد AI</span> — أداة دردشة ذكية مدمجة في موقع العميل للتعامل التلقائي مع
          استفسارات الزوار
        </li>
        <li>
          <span className="text-white">قاعدة المعرفة</span> — نظام لتخزين واسترجاع المعلومات التجارية لتوليد إجابات
          دقيقة
        </li>
        <li>
          <span className="text-white">التكامل متعدد القنوات</span> — ربط Telegram وWhatsApp وInstagram لمعالجة
          الاستفسارات من قنوات مختلفة
        </li>
        <li>
          <span className="text-white">التحليلات</span> — لوحة تحكم مع إحصائيات الاستفسارات وأداء AI ومقاييس رضا
          المستخدمين
        </li>
        <li>
          <span className="text-white">لوحة تحكم العميل</span> — واجهة لتكوين الأداة وإدارة المعرفة ومراجعة السجل والدفع
        </li>
      </ul>

      <SectionTitle>3. الأدوات التجريبية</SectionTitle>
      <p>تقوم الشركة بإنشاء نسخ تجريبية من أدوات AI للعملاء المحتملين لأغراض المعاينة.</p>
      <p>عند إنشاء العروض التجريبية:</p>
      <ul className="mr-6 list-disc space-y-1">
        <li>نستخدم فقط المعلومات المتاحة للعامة من موقع العميل</li>
        <li>يتم عرض الموقع في iframe لأغراض المعاينة فقط</li>
        <li>لا نقوم بنسخ أو تعديل محتوى الموقع</li>
        <li>العرض التجريبي مخصص للعرض المرئي فقط</li>
        <li>بناءً على الطلب، سيتم إزالة الأداة التجريبية فوراً</li>
        <li>لا تجمع الأدوات التجريبية بيانات شخصية قبل توقيع العقد</li>
      </ul>

      <SectionTitle>4. التسجيل والوصول</SectionTitle>
      <p>
        يتم الوصول إلى المنصة من خلال <span className="text-white">رمز وصول</span> فريد. يتحمل العميل مسؤولية أمان
        الرمز.
      </p>
      <p>التزامات العميل:</p>
      <ul className="mr-6 list-disc space-y-1">
        <li>تقديم معلومات دقيقة</li>
        <li>تحديث بيانات الحساب في الوقت المناسب</li>
        <li>الحفاظ على أمان رمز الوصول</li>
        <li>الإبلاغ الفوري عن أي وصول غير مصرح به</li>
      </ul>

      <SectionTitle>5. الاستخدام المقبول</SectionTitle>
      <p>يُحظر:</p>
      <ul className="mr-6 list-disc space-y-1">
        <li>نشر محتوى غير قانوني أو مسيء أو ضار</li>
        <li>الوصول غير المصرح به إلى أنظمة المنصة</li>
        <li>الهندسة العكسية للبرمجيات</li>
        <li>التحميل الآلي المفرط على الأنظمة</li>
        <li>انتهاك حقوق الملكية الفكرية</li>
        <li>إعادة البيع أو الترخيص من الباطن دون موافقة الشركة</li>
      </ul>

      <SectionTitle>6. الملكية الفكرية</SectionTitle>
      <ul className="mr-6 list-disc space-y-1">
        <li>
          <span className="text-white">المنصة</span> — البرمجيات والتصميم والكود والخوارزميات ملك لـ WinBix AI
        </li>
        <li>
          <span className="text-white">محتوى العميل</span> — البيانات التي يرفعها العميل تبقى ملكاً للعميل
        </li>
        <li>
          <span className="text-white">ردود AI</span> — تُقدم &quot;كما هي&quot;. الشركة غير مسؤولة عن دقتها
        </li>
      </ul>

      <SectionTitle>7. الأسعار والدفع</SectionTitle>
      <ul className="mr-6 list-disc space-y-1">
        <li>
          <span className="text-white">الاشتراك</span> — شهري أو دفع مسبق لمدة 3/6/12 شهراً
        </li>
        <li>
          <span className="text-white">تكلفة AI</span> — بناءً على الاستهلاك الفعلي لرموز نموذج AI
        </li>
        <li>
          <span className="text-white">أرصدة إضافية</span> — متاحة عند تجاوز الحد
        </li>
        <li>
          <span className="text-white">الحظر</span> — قد يتم تعليق الأداة عند بلوغ عتبة 40$/شهر
        </li>
      </ul>
      <p>الدفع عبر WayForPay وCryptomus وNowPayments. يتم تحديد المبالغ المستردة بشكل فردي.</p>

      <SectionTitle>8. معالجة البيانات</SectionTitle>
      <p>
        تتم معالجة البيانات وفقاً لـ{' '}
        <Link href="/privacy" className="text-white underline hover:text-gray-300">
          سياسة الخصوصية
        </Link>{' '}
        الخاصة بنا.
      </p>
      <p>
        العميل هو <span className="text-white">المتحكم في البيانات</span>. الشركة تعمل كـ{' '}
        <span className="text-white">معالج البيانات</span>.
      </p>

      <SectionTitle>9. توفر الخدمة</SectionTitle>
      <p>نبذل جهوداً معقولة تجارياً لضمان عمل المنصة. لا نضمن توفراً بنسبة 100%.</p>
      <p>لا نتحمل المسؤولية عن:</p>
      <ul className="mr-6 list-disc space-y-1">
        <li>الصيانة المجدولة (مع إشعار مسبق)</li>
        <li>انقطاع خدمات الأطراف الثالثة</li>
        <li>ظروف القوة القاهرة</li>
      </ul>

      <SectionTitle>10. تحديد المسؤولية</SectionTitle>
      <p>إلى أقصى حد يسمح به القانون:</p>
      <ul className="mr-6 list-disc space-y-1">
        <li>يتم تقديم المنصة &quot;كما هي&quot; دون أي ضمانات</li>
        <li>الشركة غير مسؤولة عن الأضرار غير المباشرة أو العرضية أو العقابية</li>
        <li>الشركة غير مسؤولة عن الردود التي يولدها AI</li>
        <li>تقتصر المسؤولية الإجمالية على المبالغ المدفوعة في آخر 3 أشهر</li>
      </ul>

      <SectionTitle>11. إنهاء الاستخدام</SectionTitle>
      <p>يمكن للعميل إنهاء الاستخدام في أي وقت. عند الإنهاء:</p>
      <ul className="mr-6 list-disc space-y-1">
        <li>يتم إلغاء تنشيط الأداة</li>
        <li>يتم حذف البيانات خلال 30 يوماً</li>
        <li>يمكن للعميل طلب تصدير البيانات</li>
      </ul>
      <p>تحتفظ الشركة بالحق في تعليق أو إنهاء الوصول بسبب المخالفات أو عدم الدفع أو لأسباب قانونية أخرى.</p>

      <SectionTitle>12. القانون الواجب التطبيق</SectionTitle>
      <p>
        تخضع هذه الشروط لقوانين <span className="text-white">أوكرانيا</span>. تُحل النزاعات من خلال التفاوض، وإذا تعذر
        ذلك، في المحاكم المختصة في أوكرانيا.
      </p>

      <SectionTitle>13. تغييرات الشروط</SectionTitle>
      <p>نحتفظ بالحق في تحديث هذه الشروط. سنقوم بإخطار المستخدمين مسبقاً بأي تغييرات جوهرية.</p>

      <SectionTitle>14. معلومات الاتصال</SectionTitle>
      <p>
        البريد الإلكتروني:{' '}
        <a href="mailto:winbix.ai@gmail.com" className="text-white underline hover:text-gray-300">
          winbix.ai@gmail.com
        </a>
      </p>
      <p>
        تيليجرام:{' '}
        <a
          href="https://t.me/winbix_ai"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white underline hover:text-gray-300"
        >
          @winbix_ai
        </a>
      </p>
    </>
  );
}

/* ──────────────────────────── CONTENT MAP ────────────────────────── */

const CONTENT_MAP: Record<string, () => React.JSX.Element> = {
  ru: RuContent,
  en: EnContent,
  uk: UkContent,
  pl: PlContent,
  ar: ArContent,
};

/* ──────────────────────────── MAIN COMPONENT ────────────────────── */

export default function TermsContent() {
  const { lang } = useLanguage();
  const { t: tc } = useTranslation('common');
  const Content = CONTENT_MAP[lang] || RuContent;

  const titles: Record<string, [string, string]> = {
    ru: ['Условия ', 'использования'],
    en: ['Terms of ', 'Service'],
    uk: ['Умови ', 'використання'],
    pl: ['Warunki ', 'korzystania'],
    ar: ['شروط ', 'الاستخدام'],
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

      {/* ── Navigation ── */}
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

      {/* ── Content ── */}
      <div className="relative z-10 mx-auto max-w-3xl px-6 pt-8 pb-24">
        <h1 className="mb-2 text-4xl font-bold text-white md:text-5xl">
          {titleBefore}
          <span className="gradient-text">{titleAccent}</span>
        </h1>
        <p className="mb-8 text-sm text-gray-500">{lastUpdated[lang] || lastUpdated.ru}</p>

        <div className="space-y-4 text-base leading-relaxed text-gray-400">
          <Content />
        </div>

        {/* ── Footer ── */}
        <div className="glow-line mt-16 mb-8 h-px" />
        <footer className="flex flex-col items-center justify-between gap-4 text-sm text-gray-600 md:flex-row">
          <p>
            &copy; {new Date().getFullYear()} WinBix AI. {tc('footer.rights')}
          </p>
          <div className="flex gap-6">
            <Link href="/privacy" className="text-gray-500 transition-colors hover:text-gray-300">
              {tc('footer.privacy')}
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
