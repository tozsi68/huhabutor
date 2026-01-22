const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

async function githubRequest(url, token, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Authorization": `token ${token}`,
      "Accept": "application/vnd.github+json",
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const adminKey = req.headers.get("x-admin-key") || "";
  const expected = process.env.ADMIN_KEY || "";
  if (!expected) return json({ error: "ADMIN_KEY nincs beallitva" }, 500);
  if (adminKey !== expected) return json({ error: "Unauthorized" }, 401);

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;     // "tozsi68/huhabutor"
  const branch = process.env.GITHUB_BRANCH || "main";

  if (!token || !repo) return json({ error: "Hiányzó GITHUB_TOKEN vagy GITHUB_REPO env" }, 500);

  const body = await req.json().catch(() => ({}));
  const path = body.path;                  // e.g. "content/home.json" or "images/konyha/123.jpg"
  const contentBase64 = body.contentBase64; // base64 without data: prefix
  const message = body.message || `Update ${path}`;

  if (!path || !contentBase64) return json({ error: "path/contentBase64 kötelező" }, 400);

  const apiBase = `https://api.github.com/repos/${repo}/contents/${encodeURIComponent(path).replaceAll("%2F", "/")}`;

  // 1) read existing to get sha (if exists)
  let sha = undefined;
  {
    const { res, data } = await githubRequest(`${apiBase}?ref=${encodeURIComponent(branch)}`, token);
    if (res.ok && data && data.sha) sha = data.sha;
    // if 404, it's fine (new file)
    if (!res.ok && res.status !== 404) {
      return json({ error: `GitHub read failed: ${res.status}`, details: data }, 500);
    }
  }

  // 2) create/update
  const payload = {
    message,
    content: contentBase64,
    branch,
    ...(sha ? { sha } : {})
  };

  const { res: putRes, data: putData } = await githubRequest(apiBase, token, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!putRes.ok) {
    return json({ error: `GitHub write failed: ${putRes.status}`, details: putData }, 500);
  }

  return json({ ok: true, path, commit: putData?.commit?.sha || null });
};
