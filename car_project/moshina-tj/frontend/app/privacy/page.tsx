import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Политика конфиденциальности | TAJCAR.TJ',
  description: 'Политика конфиденциальности платформы TAJCAR.TJ.',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '36px' }}>
      <h2
        style={{
          fontSize: '18px',
          fontWeight: 700,
          color: 'var(--text)',
          marginBottom: '12px',
          paddingBottom: '8px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {title}
      </h2>
      <div
        style={{
          fontSize: '15px',
          color: 'var(--text-secondary)',
          lineHeight: 1.75,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {children}
      </div>
    </section>
  )
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li
      style={{
        paddingLeft: '4px',
        color: 'var(--text-secondary)',
        lineHeight: 1.7,
      }}
    >
      {children}
    </li>
  )
}

export default function PrivacyPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />

      <main
        style={{ flex: 1, padding: '40px 16px 60px' }}
        className="max-w-3xl mx-auto w-full"
      >
        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 800,
              color: 'var(--text)',
              marginBottom: '8px',
              letterSpacing: '-0.02em',
            }}
          >
            Политика конфиденциальности
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            Дата вступления в силу: 1 января 2025 г. &nbsp;&middot;&nbsp; Платформа TAJCAR.TJ
          </p>
        </div>

        <Section title="1. Введение">
          <p>
            TAJCAR.TJ уважает конфиденциальность пользователей и обязуется защищать
            персональные данные в соответствии с законодательством Республики Таджикистан.
            Настоящая Политика объясняет, какие данные мы собираем, как их используем и
            каковы ваши права.
          </p>
        </Section>

        <Section title="2. Какие данные мы собираем">
          <p>При регистрации и использовании платформы мы можем собирать следующие данные:</p>
          <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <Li>
              <strong>Персональные данные:</strong> имя, адрес электронной почты, номер
              телефона.
            </Li>
            <Li>
              <strong>Данные объявлений:</strong> фотографии автомобилей, описания,
              технические характеристики, цены.
            </Li>
            <Li>
              <strong>Данные авторизации через сторонние сервисы:</strong> при входе через
              Google или Apple мы получаем имя и email из профиля этих сервисов.
            </Li>
            <Li>
              <strong>Технические данные:</strong> IP-адрес, тип браузера, страницы просмотра,
              время посещения — для аналитики и безопасности.
            </Li>
            <Li>
              <strong>Cookies:</strong> файлы cookie и аналогичные технологии для работы
              сессий и улучшения пользовательского опыта.
            </Li>
          </ul>
        </Section>

        <Section title="3. Как мы используем данные">
          <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <Li>Регистрация аккаунта и идентификация пользователя.</Li>
            <Li>Верификация номера телефона через OTP-код (SMS или Telegram).</Li>
            <Li>Отображение объявлений и связь продавца с покупателем.</Li>
            <Li>Отправка системных уведомлений: статус объявления, новые сообщения.</Li>
            <Li>Модерация контента и предотвращение мошенничества.</Li>
            <Li>Анализ использования платформы для улучшения сервиса.</Li>
            <Li>Соблюдение требований законодательства.</Li>
          </ul>
        </Section>

        <Section title="4. Хранение данных">
          <p>
            Данные пользователей хранятся в защищённой базе данных PostgreSQL на
            серверах с ограниченным доступом. Фотографии объявлений хранятся в облачном
            сервисе Cloudinary, расположенном за пределами Таджикистана.
          </p>
          <p>
            Мы принимаем технические и организационные меры для защиты данных от
            несанкционированного доступа, изменения или уничтожения.
          </p>
          <p>
            Данные хранятся в течение срока существования аккаунта и 30 дней после его
            удаления, если иное не требуется по закону.
          </p>
        </Section>

        <Section title="5. Передача данных третьим сторонам">
          <p>
            Мы не продаём и не сдаём в аренду ваши персональные данные. Данные могут
            передаваться только следующим партнёрам в рамках работы платформы:
          </p>
          <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <Li>
              <strong>Resend</strong> — сервис отправки транзакционных email-уведомлений
              (подтверждение регистрации, смена пароля).
            </Li>
            <Li>
              <strong>Telegram</strong> — при использовании входа через Telegram
              мы получаем идентификатор чата для отправки OTP-кодов.
            </Li>
            <Li>
              <strong>Cloudinary</strong> — облачное хранилище для загружаемых
              фотографий объявлений.
            </Li>
            <Li>
              <strong>Google / Apple</strong> — при использовании OAuth-авторизации.
            </Li>
          </ul>
          <p>
            Данные могут быть раскрыты по законному требованию государственных органов
            Республики Таджикистан.
          </p>
        </Section>

        <Section title="6. Cookies">
          <p>
            Мы используем файлы cookie для хранения сессии пользователя, языковых
            настроек и темы оформления. Вы можете отключить cookies в настройках
            браузера, однако это может нарушить работу сайта.
          </p>
        </Section>

        <Section title="7. Ваши права">
          <p>Вы имеете право:</p>
          <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <Li>Запросить доступ к хранящимся персональным данным.</Li>
            <Li>Исправить неточные данные через настройки профиля.</Li>
            <Li>Удалить аккаунт и связанные данные — через запрос в поддержку.</Li>
            <Li>Возразить против обработки данных в определённых целях.</Li>
          </ul>
          <p>
            Для реализации прав обратитесь по адресу: <strong>support@tajcar.tj</strong>.
            Мы ответим в течение 10 рабочих дней.
          </p>
        </Section>

        <Section title="8. Дети">
          <p>
            Платформа предназначена для лиц старше 18 лет. Мы сознательно не собираем
            данные несовершеннолетних. Если вы считаете, что ребёнок зарегистрировался
            на сайте, сообщите нам — мы удалим аккаунт.
          </p>
        </Section>

        <Section title="9. Изменения политики">
          <p>
            Мы вправе обновлять настоящую Политику. Актуальная версия всегда доступна на
            этой странице. О существенных изменениях мы уведомим пользователей через
            email или уведомление на сайте.
          </p>
        </Section>

        <Section title="10. Контактная информация">
          <p>По вопросам конфиденциальности обращайтесь:</p>
          <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <Li>Email: support@tajcar.tj</Li>
            <Li>Telegram: @TajCarTJ</Li>
            <Li>Адрес: г. Душанбе, Республика Таджикистан</Li>
          </ul>
        </Section>
      </main>

      <Footer />
    </div>
  )
}
