const getFirstZodMessage = (zodError) => {
  const first = zodError?.issues?.[0];
  return first?.message || "Invalid request";
};

const getFirstJoiMessage = (joiError) => {
  const detail = joiError?.details?.[0];
  return detail?.message || "Invalid request";
};

// Backwards compatible:
// - validateRequest(schema) validates req.body
// - validateRequest(schema, 'query'|'params'|'body', { assign, joiOptions })
const validateRequest = (schema, source = "body", options = {}) =>
  async (req, res, next) => {
    try {
      const target = req?.[source] ?? {};
      const assign = Boolean(options.assign);
      const joiOptions = options.joiOptions || undefined;

      if (!schema) return next();

      // Zod
      if (typeof schema.safeParse === "function") {
        const result = schema.safeParse(target);
        if (!result.success) {
          return res.status(400).json({ message: getFirstZodMessage(result.error) });
        }
        if (assign) req[source] = result.data;
        return next();
      }

      // Joi (async)
      if (typeof schema.validateAsync === "function") {
        const value = await schema.validateAsync(target, {
          abortEarly: true,
          ...joiOptions,
        });
        if (assign) req[source] = value;
        return next();
      }

      // Joi (sync)
      if (typeof schema.validate === "function") {
        const { error, value } = schema.validate(target, {
          abortEarly: true,
          ...joiOptions,
        });
        if (error) {
          return res.status(400).json({ message: getFirstJoiMessage(error) });
        }
        if (assign) req[source] = value;
        return next();
      }

      return res.status(500).json({ message: "Invalid validation schema" });
    } catch (error) {
      // Joi validateAsync throws
      return res.status(400).json({ message: getFirstJoiMessage(error) });
    }
  };

module.exports = validateRequest;
