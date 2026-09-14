import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BackendAuthError, postSignInMicrosoft, postSignOut } from '@/lib/api/auth-backend';
import { BackendFetchTimeoutError } from '@/lib/api/fetch-with-timeout';

vi.mock('@/lib/api/config', () => ({
  getApiBaseUrl: () => 'https://api.example.test',
}));

const encoder = new TextEncoder();

function dripBody(first: string, last: string, delayMs: number, status = 200): Response {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(first));
      timer = setTimeout(() => {
        controller.enqueue(encoder.encode(last));
        controller.close();
      }, delayMs);
    },
    cancel() {
      if (timer) clearTimeout(timer);
    },
  });
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('auth backend — deadline do corpo completo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv('API_FETCH_TIMEOUT_MS', '3000');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it('converte body drip do login em falha bounded de autenticação', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(
      dripBody('{"token":', 'null}', 4_000),
    ));

    const pending = postSignInMicrosoft('id-token-microsoft');
    const assertion = expect(pending).rejects.toMatchObject({
      name: 'BackendAuthError',
      status: 503,
      body: expect.any(BackendFetchTimeoutError),
    });
    await vi.advanceTimersByTimeAsync(3_000);
    await assertion;
  });

  it('mantém o corpo de erro JSON disponível para tradução', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Credenciais inválidas' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    ));

    await expect(postSignInMicrosoft('id-token-microsoft')).rejects.toMatchObject({
      name: 'BackendAuthError',
      status: 401,
      body: { detail: 'Credenciais inválidas' },
    } satisfies Partial<BackendAuthError>);
  });

  it('também limita o corpo da revogação de sessão', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(
      dripBody('{"status":', '"ok"}', 4_000),
    ));

    const pending = postSignOut('access-token');
    const assertion = expect(pending).rejects.toBeInstanceOf(BackendFetchTimeoutError);
    await vi.advanceTimersByTimeAsync(3_000);
    await assertion;
  });
});
