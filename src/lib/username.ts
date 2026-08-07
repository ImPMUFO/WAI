/**
 * قوانین آیدی WAIMA
 */
export const USERNAME_MAX = 20
export const USERNAME_CHANGE_DAILY_LIMIT = 5

export function usernameToEmail(username: string) {
  return `${username.toLowerCase()}@waima.user`
}

export function validateUsername(raw: string): { ok: true; value: string } | { ok: false; error: string } {
  const value = (raw || '').trim().toLowerCase()
  if (!value) return { ok: false, error: 'آیدی خالی است.' }
  if (value.length > USERNAME_MAX) return { ok: false, error: 'حداکثر ۲۰ کاراکتر.' }
  if (!/^[a-z][a-z0-9_]*$/.test(value)) {
    return {
      ok: false,
      error: 'فقط حروف کوچک انگلیسی، عدد و خط زیر. نباید با عدد یا _ شروع شود.',
    }
  }
  if (/__/.test(value)) return { ok: false, error: 'دو خط زیر پشت‌سرهم مجاز نیست.' }
  return { ok: true, value }
}

export const USERNAME_HELP =
  'آیدی فقط با حروف کوچک انگلیسی (a-z)، عدد (0-9) و خط زیر (_) — حداکثر ۲۰ کاراکتر. نباید با عدد یا خط زیر شروع شود. مثال: ali_reza2'

export const PASSWORD_WARN =
  'حتماً آیدی و رمز را جایی یادداشت کن. اگر فراموش کنی، ممکن است به حسابت دسترسی نداشته باشی.'
