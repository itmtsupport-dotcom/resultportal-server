const ok = (res, data) => {
  return res.status(200).json(data);
};

module.exports = { ok };
