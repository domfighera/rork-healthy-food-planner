const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

type StoredFavoriteItem = {
  id: string;
  name: string;
  brand: string;
  price: number;
  createdAt: string;
};

type StoredGroceryEntry = {
  id: string;
  productName: string;
  price: number;
  date: string;
  weekKey: string;
  sourceEntryId?: string;
  mergedIntoWeeks: string[];
};

const favoritesStore: StoredFavoriteItem[] = [];
const groceryHistoryStore: StoredGroceryEntry[] = [];

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

function createIdentifier(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function sanitizeText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getWeekKey(date: Date): string {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const diffDays = Math.floor((utcDate.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24));
  const weekNumber = Math.floor(diffDays / 7);
  return `${utcDate.getUTCFullYear()}-W${weekNumber}`;
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

  if (pathname === "/api/favorites" && request.method === "GET") {
    return createJsonResponse({ favorites: favoritesStore });
  }

  if (pathname === "/api/favorites" && request.method === "POST") {
    try {
      const body = (await request.json()) as {
        name?: unknown;
        brand?: unknown;
        price?: unknown;
      };

      const name = sanitizeText(body.name);
      const brand = sanitizeText(body.brand) ?? "Unbranded";
      const price = toNumber(body.price);

      if (!name || price === null || price < 0) {
        return createJsonResponse({ error: "Invalid favorite payload" }, { status: 400 });
      }

      const favorite: StoredFavoriteItem = {
        id: createIdentifier(),
        name,
        brand,
        price,
        createdAt: new Date().toISOString(),
      };

      favoritesStore.unshift(favorite);
      console.log("[Backend] Favorite added", favorite);
      return createJsonResponse({ favorite });
    } catch (error) {
      console.error("[Backend] Failed to add favorite", error);
      return createJsonResponse({ error: "Unable to add favorite" }, { status: 500 });
    }
  }

  if (pathname.startsWith("/api/favorites/") && request.method === "PATCH") {
    const id = pathname.split("/").pop();
    if (!id) {
      return createJsonResponse({ error: "Favorite id is required" }, { status: 400 });
    }

    try {
      const body = (await request.json()) as {
        name?: unknown;
        brand?: unknown;
        price?: unknown;
      };

      const favorite = favoritesStore.find((item) => item.id === id);
      if (!favorite) {
        return createJsonResponse({ error: "Favorite not found" }, { status: 404 });
      }

      const maybeName = sanitizeText(body.name);
      const maybeBrand = sanitizeText(body.brand);
      const maybePrice = toNumber(body.price);

      if (maybePrice !== null && maybePrice >= 0) {
        favorite.price = maybePrice;
      }

      if (maybeName) {
        favorite.name = maybeName;
      }

      if (maybeBrand) {
        favorite.brand = maybeBrand;
      }

      console.log("[Backend] Favorite updated", favorite);
      return createJsonResponse({ favorite });
    } catch (error) {
      console.error("[Backend] Failed to update favorite", error);
      return createJsonResponse({ error: "Unable to update favorite" }, { status: 500 });
    }
  }

  if (pathname.startsWith("/api/favorites/") && request.method === "DELETE") {
    const id = pathname.split("/").pop();
    if (!id) {
      return createJsonResponse({ error: "Favorite id is required" }, { status: 400 });
    }

    const index = favoritesStore.findIndex((item) => item.id === id);
    if (index === -1) {
      return createJsonResponse({ error: "Favorite not found" }, { status: 404 });
    }

    favoritesStore.splice(index, 1);
    console.log("[Backend] Favorite removed", id);
    return createJsonResponse({ success: true });
  }

  if (pathname === "/api/grocery-history/entry" && request.method === "POST") {
    try {
      const body = (await request.json()) as {
        id?: unknown;
        productName?: unknown;
        price?: unknown;
        date?: unknown;
      };

      const productName = sanitizeText(body.productName);
      const price = toNumber(body.price);
      const dateValue = sanitizeText(body.date);
      const incomingId = sanitizeText(body.id) ?? createIdentifier();

      if (!productName || price === null || price < 0) {
        return createJsonResponse({ error: "Invalid grocery entry payload" }, { status: 400 });
      }

      const parsedDate = dateValue ? new Date(dateValue) : new Date();
      if (Number.isNaN(parsedDate.getTime())) {
        return createJsonResponse({ error: "Invalid date supplied" }, { status: 400 });
      }

      const weekKey = getWeekKey(parsedDate);

      const existingIndex = groceryHistoryStore.findIndex((entry) => entry.id === incomingId);
      const storedEntry: StoredGroceryEntry = {
        id: incomingId,
        productName,
        price,
        date: parsedDate.toISOString(),
        weekKey,
        mergedIntoWeeks: [],
      };

      if (existingIndex >= 0) {
        groceryHistoryStore[existingIndex] = storedEntry;
      } else {
        groceryHistoryStore.push(storedEntry);
      }

      console.log("[Backend] Grocery entry recorded", storedEntry);
      return createJsonResponse({ entry: storedEntry });
    } catch (error) {
      console.error("[Backend] Failed to record grocery entry", error);
      return createJsonResponse({ error: "Unable to record grocery entry" }, { status: 500 });
    }
  }

  if (pathname === "/api/grocery-history/merge" && request.method === "POST") {
    const now = new Date();
    const currentWeekKey = getWeekKey(now);
    const previousWeekReference = new Date(now);
    previousWeekReference.setDate(previousWeekReference.getDate() - 7);
    const previousWeekKey = getWeekKey(previousWeekReference);

    const entriesToMerge = groceryHistoryStore.filter(
      (entry) => entry.weekKey === previousWeekKey && !entry.mergedIntoWeeks.includes(currentWeekKey),
    );

    if (entriesToMerge.length === 0) {
      return createJsonResponse({ entries: [] });
    }

    const mergedEntries: StoredGroceryEntry[] = entriesToMerge.map((entry) => {
      entry.mergedIntoWeeks.push(currentWeekKey);
      const clonedEntry: StoredGroceryEntry = {
        id: createIdentifier(),
        productName: entry.productName,
        price: entry.price,
        date: now.toISOString(),
        weekKey: currentWeekKey,
        sourceEntryId: entry.id,
        mergedIntoWeeks: [],
      };
      groceryHistoryStore.push(clonedEntry);
      return clonedEntry;
    });

    console.log("[Backend] Merged previous week entries", {
      previousWeekKey,
      mergedCount: mergedEntries.length,
    });

    return createJsonResponse({ entries: mergedEntries });
  }

  return notFound();
}

export default { fetch: fetchHandler };
