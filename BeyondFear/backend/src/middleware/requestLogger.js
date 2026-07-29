export const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Log request
  console.log(`📥 ${req.method} ${req.path}`);

  // Capture response
  const originalSend = res.send;
  res.send = function (data) {
    const duration = Date.now() - start;
    console.log(`📤 ${req.method} ${req.path} ${res.statusCode} (${duration}ms)`);
    return originalSend.call(this, data);
  };

  next();
};
