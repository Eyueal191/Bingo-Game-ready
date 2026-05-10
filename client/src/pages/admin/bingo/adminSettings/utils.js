export const emptyAccount = () => ({
  provider: "",
  label: "",
  accountName: "",
  accountNumber: "",
  instructions: "",
  isActive: true,
  metadata: undefined,
});

export const slugify = (value = "") =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

export const trimAt = (value = "") => value.toString().trim().replace(/^@/, "");

export const mapAccountToDraft = (account = {}) => ({
  ...emptyAccount(),
  ...account,
  provider: account.provider || "",
  label: account.label || "",
  accountName: account.accountName || "",
  accountNumber: account.accountNumber || "",
  instructions: account.instructions || "",
  isActive: account.isActive !== false,
  metadata: account.metadata,
});

export const mergePaymentAccountsForUi = (defaults = {}, overrides = {}) => {
  const map = new Map();

  const add = (account) => {
    if (!account) return;
    const key =
      slugify(account.provider || "") ||
      slugify(account.label || "") ||
      account.accountNumber ||
      (account.accountName ? `acct-${slugify(account.accountName)}` : "");
    if (!key) return;
    const existing = map.get(key) || {};
    map.set(key, {
      ...existing,
      ...account,
    });
  };

  (Array.isArray(defaults.manual) ? defaults.manual : []).forEach(add);
  (Array.isArray(overrides.manual) ? overrides.manual : []).forEach(add);

  return {
    manual: Array.from(map.values()),
    instructions: overrides.instructions ?? defaults.instructions ?? "",
    supportNote: overrides.supportNote ?? defaults.supportNote ?? "",
  };
};

export const humanizeKey = (key) =>
  key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase());
