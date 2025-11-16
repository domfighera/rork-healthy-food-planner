import { type QueryClient } from "@tanstack/react-query";
import { ReactNode, createContext, createElement, useContext, useMemo } from "react";

const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_RORK_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  }

  throw new Error(
    "No base url found, please set EXPO_PUBLIC_RORK_API_BASE_URL"
  );
};

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type QueryParamValue = string | number | boolean | null | undefined;

type QueryParams = Record<string, QueryParamValue>;

type RequestOptions<TBody> = {
  method?: HttpMethod;
  body?: TBody;
  query?: QueryParams;
  headers?: Record<string, string>;
};

class ApiClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private buildUrl(endpoint: string, query?: QueryParams): string {
    const base = this.baseUrl.endsWith("/") ? this.baseUrl : `${this.baseUrl}/`;
    const sanitizedEndpoint = endpoint.startsWith("/")
      ? endpoint.slice(1)
      : endpoint;
    const initialUrl = /^https?:\/\//.test(endpoint)
      ? new URL(endpoint)
      : new URL(sanitizedEndpoint, base);

    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value === undefined || value === null) {
          return;
        }

        initialUrl.searchParams.set(key, String(value));
      });
    }

    return initialUrl.toString();
  }

  async request<TResponse, TBody = unknown>(
    endpoint: string,
    options?: RequestOptions<TBody>,
  ): Promise<TResponse> {
    const method: HttpMethod = options?.method
      ?? (options?.body !== undefined ? "POST" : "GET");

    const headers: Record<string, string> = {
      Accept: "application/json",
      ...(options?.headers ?? {}),
    };

    const url = this.buildUrl(endpoint, options?.query);

    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    if (options?.body !== undefined) {
      if (!headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
      }

      fetchOptions.body =
        headers["Content-Type"].includes("application/json")
          ? JSON.stringify(options.body)
          : (options.body as string);
    }

    console.log("[ApiClient] request", { method, url, body: options?.body });

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[ApiClient] request failed", {
        method,
        url,
        status: response.status,
        statusText: response.statusText,
        errorText,
      });

      throw new Error(
        `Request failed with status ${response.status}: ${response.statusText}`,
      );
    }

    if (response.status === 204) {
      return undefined as TResponse;
    }

    const contentType = response.headers.get("content-type") ?? "";

    if (!contentType.includes("application/json")) {
      const textPayload = await response.text();
      return textPayload as unknown as TResponse;
    }

    const data = (await response.json()) as TResponse;
    console.log("[ApiClient] response", { method, url, data });
    return data;
  }

  get<TResponse>(endpoint: string, query?: QueryParams) {
    return this.request<TResponse>(endpoint, { method: "GET", query });
  }

  post<TResponse, TBody = unknown>(endpoint: string, body?: TBody) {
    return this.request<TResponse, TBody>(endpoint, { method: "POST", body });
  }

  put<TResponse, TBody = unknown>(endpoint: string, body?: TBody) {
    return this.request<TResponse, TBody>(endpoint, { method: "PUT", body });
  }

  patch<TResponse, TBody = unknown>(endpoint: string, body?: TBody) {
    return this.request<TResponse, TBody>(endpoint, { method: "PATCH", body });
  }

  delete<TResponse>(endpoint: string) {
    return this.request<TResponse>(endpoint, { method: "DELETE" });
  }
}

const ApiClientContext = createContext<ApiClient | undefined>(undefined);

type ProviderProps = {
  client: ApiClient;
  queryClient: QueryClient;
  children: ReactNode;
};

type ApiClientProviderProps = {
  client: ApiClient;
  children: ReactNode;
};

function ApiClientProvider({ client, children }: ApiClientProviderProps) {
  const value = useMemo(() => client, [client]);

  return createElement(ApiClientContext.Provider, { value }, children);
}

export function useApiClient() {
  const context = useContext(ApiClientContext);

  if (!context) {
    throw new Error("useApiClient must be used within an ApiClientProvider");
  }

  return context;
}

export const trpc = {
  Provider: ({ client, queryClient: _queryClient, children }: ProviderProps) =>
    createElement(ApiClientProvider, { client }, children),
};

export const trpcClient = new ApiClient(getBaseUrl());

export type { ApiClient };
export type { RequestOptions as ApiRequestOptions, QueryParams as ApiQueryParams };
