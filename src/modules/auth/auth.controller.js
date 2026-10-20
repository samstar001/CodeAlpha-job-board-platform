// Convert validated HTTP inputs into service calls and standard success envelopes.
export const createAuthController = service => ({
  register: async (req, res) => res.status(201).json({ data: await service.register(req.body) }),
  login: async (req, res) => res.json({ data: await service.login(req.body) }),
});
