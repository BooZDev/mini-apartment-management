// Công cụ dùng chung cho kịch bản kiểm thử đầu cuối
export const BASE = (process.argv[2] ?? 'http://127.0.0.1:3101') + '/api/v1';
export const ORIGIN = 'http://localhost:3000';

const iso = (d) => d.toISOString().slice(0, 10);
export const TODAY = iso(new Date(Date.now() + 7 * 3600 * 1000));
export const addDays = (date, n) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
};
export const addMonths = (date, n) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return iso(d);
};

export const result = { pass: 0, fail: 0 };
let ipCounter = 10;

export function check(name, cond, info) {
  if (cond) {
    result.pass++;
    console.log('  PASS', name);
  } else {
    result.fail++;
    console.log('  FAIL', name, info === undefined ? '' : JSON.stringify(info).slice(0, 700));
  }
}

export function finish() {
  console.log(`\nKết quả: ${result.pass} đạt, ${result.fail} lỗi`);
  process.exit(result.fail ? 1 : 0);
}

/** Trình duyệt giả lập: giữ cookie theo tên, mỗi client một IP (TRUST_PROXY=1). */
export class Client {
  constructor(name) {
    this.name = name;
    this.jar = new Map();
    this.setCookies = [];
    this.ip = `10.${Math.floor(ipCounter / 250)}.0.${ipCounter++ % 250}`;
  }

  async req(method, path, body, headers = {}) {
    const h = { 'X-Forwarded-For': this.ip, ...headers };
    if (body !== undefined) h['Content-Type'] = 'application/json';
    if (method !== 'GET' && !('Origin' in headers)) h.Origin = ORIGIN;
    if (headers.Origin === null) delete h.Origin;
    if (this.jar.size > 0) h.Cookie = [...this.jar].map(([k, v]) => `${k}=${v}`).join('; ');
    const res = await fetch(BASE + path, {
      method,
      headers: h,
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    });
    const cookies = res.headers.getSetCookie();
    if (cookies.length) this.setCookies = cookies;
    for (const cookie of cookies) {
      const [pair] = cookie.split(';');
      const index = pair.indexOf('=');
      const name = pair.slice(0, index);
      const value = pair.slice(index + 1);
      if (!value || /Expires=Thu, 01 Jan 1970/i.test(cookie)) this.jar.delete(name);
      else this.jar.set(name, value);
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    let json = null;
    const text = buffer.toString('utf8');
    if ((res.headers.get('content-type') ?? '').includes('json')) {
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = text;
      }
    }
    return { status: res.status, body: json, headers: res.headers, buffer };
  }

  get(p, h) {
    return this.req('GET', p, undefined, h);
  }
  post(p, b, h) {
    return this.req('POST', p, b, h);
  }
  patch(p, b, h) {
    return this.req('PATCH', p, b, h);
  }
  put(p, b, h) {
    return this.req('PUT', p, b, h);
  }
  del(p, h) {
    return this.req('DELETE', p, undefined, h);
  }
  login(username, password) {
    return this.post('/auth/login', { username, password });
  }
}

export const code = (r) => r.body?.error?.code;
export const details = (r) => r.body?.error?.details ?? [];
export const hasDetail = (r, field, c) => details(r).some((d) => d.field === field && (!c || d.code === c));
