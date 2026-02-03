const ENDPOINTS = [
  "https://api.hellius.atmansystems.com/ping",
  "https://df.hellius.atmansystems.com/api/ping",
];

const webhook = process.env.SLACK_WEBHOOK_URL;

if (!webhook) {
  console.error("SLACK_WEBHOOK_URL não definido.");
  process.exit(2);
}

async function fetchStatus(url, timeoutMs = 5000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);

  const start = Date.now();
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    return { ok: res.status === 200, status: res.status, ms: Date.now() - start };
  } catch (e) {
    return { ok: false, status: null, ms: Date.now() - start, error: e?.name || String(e) };
  } finally {
    clearTimeout(t);
  }
}

async function postSlack(text) {
  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("Falha ao postar no Slack:", res.status, body);
  }
}

(async () => {
  const results = await Promise.all(
    ENDPOINTS.map(async (url) => ({ url, r: await fetchStatus(url) }))
  );

  const lines = results.map(({ url, r }) => {
    if (r.status === null) return `• ${url} — sem resposta (erro/timeout) em ${r.ms}ms (${r.error})`;
    return `• ${url} — status ${r.status} em ${r.ms}ms`;
  });

  const problems = results.filter(x => !x.r.ok);

  if (problems.length === 0) {
    process.exit(0);
  }

  await postSlack(`🚨 *Healthcheck DOWN*\n${lines.join("\n")}`);
  process.exit(1);
})();
