export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body?.data ?? req.body);
    if (!result.success) {
      const messages = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
      return res.status(400).json({ ok: false, message: messages.join('; ') });
    }
    req.validatedData = result.data;
    next();
  };
}
