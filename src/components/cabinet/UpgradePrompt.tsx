'use client';

interface UpgradePromptProps {
  daysLeft: number;
  trialProgress: number;
  onSetupPayment: () => void;
  monthlyPrice?: number;
}

export default function UpgradePrompt({
  daysLeft,
  trialProgress,
  onSetupPayment,
  monthlyPrice = 65,
}: UpgradePromptProps) {
  const isUrgent = daysLeft <= 3;
  const isExpired = daysLeft <= 0;

  if (isExpired) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-red-500/30 bg-red-500/5 p-6">
        <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-transparent" />
        <div className="relative">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-2xl">
              🚫
            </div>
            <div className="flex-1">
              <h3 className="mb-1 text-lg font-semibold text-red-400">Trial период истёк</h3>
              <p className="mb-4 text-sm text-gray-400">
                Ваш AI-виджет приостановлен. Настройте оплату, чтобы возобновить работу.
              </p>
              <button
                onClick={onSetupPayment}
                className="rounded-xl bg-red-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-500/20 transition-all hover:bg-red-700"
              >
                Возобновить подписку — ${monthlyPrice}/мес
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-6 ${
        isUrgent
          ? 'border-amber-500/30 bg-amber-500/5'
          : 'border-cyan-500/20 bg-gradient-to-r from-cyan-500/5 to-purple-500/5'
      }`}
    >
      <div className="relative">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-2xl ${
              isUrgent ? 'bg-amber-500/10' : 'bg-cyan-500/10'
            }`}
          >
            {isUrgent ? '⚠️' : '⏰'}
          </div>
          <div className="flex-1">
            <h3 className={`mb-1 text-lg font-semibold ${isUrgent ? 'text-amber-400' : 'text-white'}`}>
              {isUrgent
                ? `Осталось ${daysLeft} ${getDayWord(daysLeft)} trial`
                : `Бесплатный период: ${daysLeft} ${getDayWord(daysLeft)}`}
            </h3>
            <p className="mb-4 text-sm text-gray-400">
              {isUrgent
                ? 'Настройте оплату сейчас, чтобы виджет не был отключен.'
                : 'Настройте оплату заранее, чтобы обеспечить бесперебойную работу виджета.'}
            </p>

            {/* Progress bar */}
            <div className="mb-4">
              <div className="mb-1.5 flex justify-between text-xs text-gray-500">
                <span>Использовано</span>
                <span>{trialProgress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/5">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    isUrgent
                      ? 'bg-gradient-to-r from-amber-500 to-red-500'
                      : 'bg-gradient-to-r from-cyan-500 to-purple-500'
                  }`}
                  style={{ width: `${trialProgress}%` }}
                />
              </div>
            </div>

            <button
              onClick={onSetupPayment}
              className={`rounded-xl px-6 py-2.5 text-sm font-semibold shadow-lg transition-all ${
                isUrgent
                  ? 'bg-amber-600 text-white shadow-amber-500/20 hover:bg-amber-700'
                  : 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-purple-500/20 hover:opacity-90'
              }`}
            >
              Настроить оплату — ${monthlyPrice}/мес
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function getDayWord(days: number): string {
  if (days === 1) return 'день';
  if (days >= 2 && days <= 4) return 'дня';
  return 'дней';
}
