/**
 * Zod validation middleware factory.
 * Validates req.body against the provided Zod schema.
 */
const validate = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    const errors = error.errors?.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    })) || [{ field: 'unknown', message: 'Validation failed' }];

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }
};

module.exports = validate;
