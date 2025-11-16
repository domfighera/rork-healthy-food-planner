const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function createJsonResponse(
  payload: unknown,
  init?: ResponseInit,
): Response {
  const headers = new Headers(init?.headers ?? {});

  Object.entries(corsHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const body = JSON.stringify(payload);

  return new Response(body, {
    ...init,
    headers,
  });
}

async function handleExampleGreeting(request: Request): Promise<Response> {
  let name = "friend";

  try {
    const data = (await request.json()) as { name?: unknown };

    if (typeof data?.name === "string" && data.name.trim().length > 0) {
      name = data.name.trim();
    }
  } catch (error) {
    console.error("[Backend] Unable to parse request payload", error);
  }

  return createJsonResponse({ hello: name, date: new Date().toISOString() });
}

function notFound(): Response {
  return createJsonResponse(
    {
      error: "Not found",
    },
    { status: 404 },
  );
}

async function fetchHandler(request: Request): Promise<Response> {
  console.log("[Backend] Incoming request", {
    method: request.method,
    url: request.url,
  });

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const url = new URL(request.url);
  const { pathname } = url;

  if (pathname === "/api/health" && request.method === "GET") {
    return createJsonResponse({ status: "ok", message: "API is running" });
  }

  if (pathname === "/api/example/hi" && request.method === "POST") {
    return handleExampleGreeting(request);
  }

  return notFound();
}

export default { fetch: fetchHandler };
