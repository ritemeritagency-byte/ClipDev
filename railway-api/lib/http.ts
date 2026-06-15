const json = (res, status, payload) => res.status(status).json(payload);

module.exports = {
  json,
};
