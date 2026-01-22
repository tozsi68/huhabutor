export default async (req) => {
  const adminKey = req.headers.get("x-admin-key") || "";
  const expected = process.env.ADMIN_KEY || "";

  if (!expected) {
    return new Response(JSON.stringify({ error: "ADMIN_KEY nincs beállítva Netlify env-ben" }), { status: 500 });
  }
  if (adminKey !== expected) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  return new Response(JSON.stringify({ ok: "pong" }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};
