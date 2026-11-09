import ipconfig from "../ipconfig";

// The WebView cannot send an Authorization header, so the mobile app exchanges
// its bearer token for a short-lived chart URL scoped to one athlete/sport.
export async function getChartUrl(path, claims) {
  const ip = ipconfig.ip;
  const response = await fetch(`http://${ip}:9999/chartToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(claims),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.rcode !== 200 || !data.token) {
    throw new Error("Chart access could not be authorised");
  }
  return `http://${ip}:9999${path}?token=${encodeURIComponent(data.token)}`;
}
