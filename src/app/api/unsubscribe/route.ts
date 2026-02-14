import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';

/**
 * GET /api/unsubscribe?token=<clientToken>
 * Unsubscribe client from email notifications using their token.
 * Returns a simple HTML confirmation page.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return new NextResponse(renderPage('Ошибка', 'Неверная ссылка для отписки.'), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  try {
    await connectDB();

    const result = await Client.findOneAndUpdate({ clientToken: token }, { emailNotifications: false }, { new: true });

    if (!result) {
      return new NextResponse(renderPage('Ошибка', 'Клиент не найден.'), {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    return new NextResponse(
      renderPage(
        'Вы отписались',
        `Email-уведомления отключены для ${result.email}. Вы можете включить их обратно в вашем <a href="/cabinet" style="color: #00d9ff;">личном кабинете</a>.`
      ),
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  } catch (error) {
    console.error('[Unsubscribe] Error:', error);
    return new NextResponse(renderPage('Ошибка', 'Произошла ошибка. Попробуйте позже.'), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

function renderPage(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — WinBix AI</title>
  <style>
    body { background: #0a0a0f; color: #fff; font-family: Arial, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 48px; max-width: 480px; text-align: center; }
    h1 { font-size: 24px; margin-bottom: 16px; }
    p { color: #9ca3af; line-height: 1.6; }
    a { color: #00d9ff; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}
