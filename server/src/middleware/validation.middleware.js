import { sendError } from '../utils/apiResponse.js';

export const validateRequest = (schema, source = 'body') => {
  return async (req, res, next) => {
    try {
      const parsed = await schema.parseAsync(req[source]);
      req[source] = parsed; // overwrite with sanitized and validated output
      next();
    } catch (err) {
      if (err.errors) {
        const formattedErrors = err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return sendError(res, 'Request validation failed', 400, formattedErrors);
      }
      return sendError(res, 'Invalid request data', 400);
    }
  };
};
