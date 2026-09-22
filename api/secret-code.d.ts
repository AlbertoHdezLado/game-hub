type SecretCodeRequest = {
  method?: string;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
};

type SecretCodeResponse = {
  status(code: number): SecretCodeResponse;
  setHeader(name: string, value: string): void;
  end(value: string): void;
};

declare const handler: (request: SecretCodeRequest, response: SecretCodeResponse) => Promise<void>;

export default handler;