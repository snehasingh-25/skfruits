/**
 * Wrap an async Express handler so rejections are passed to next(err).
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
