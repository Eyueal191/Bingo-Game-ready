class ProviderError extends Error {
  constructor(provider, message, options = {}) {
    super(message || "Provider error");
    this.name = "ProviderError";
    this.provider = provider;
    this.code = options.code;
    this.httpStatus = options.httpStatus;
    this.details = options.details;
    this.raw = options.raw;
    this.endpoint = options.endpoint;
    this.isProviderError = true;
    if (options.cause) this.cause = options.cause;
    Error.captureStackTrace?.(this, ProviderError);
  }
}

module.exports = { ProviderError };
