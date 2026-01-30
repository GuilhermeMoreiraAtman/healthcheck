const ENDPOINTS = [
  "https://api.hellius.atmansystems.com/ping",
  "https://df.hellius.atmansystems.com/api/ping",
];

const webhook = process.env.SLACK_WEBHOOK_URL;

async function fetchStatus(url, timeoutMs = 5000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    return { ok: res.status === 200, status: res.status };
  } catch (e) {
    return { ok: false, status: null };
  } finally {
    clearTimeout(t);
  }
}

async function postSlack(text) {
  await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
}

(async () => {
  const results = await Promise.all(
    ENDPOINTS.map(async (url) => ({ url, r: await fetchStatus(url) }))
  );

  const problems = results.filter(x => !x.r.ok);
  if (problems.length === 0) process.exit(0); // não manda nada

  const lines = problems.map(p =>
    `• ${p.url} — ${p.r.status ?? "sem resposta (erro/timeout)"}`
  );

  await postSlack(`🚨 *Healthcheck DOWN*\n${lines.join("\n")}`);
  process.exit(1);
})();
