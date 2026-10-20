// Expose the caller's safe identity/profile and profile edits through the HTTP contract.
export const createProfileController = service => ({
  me: async (req, res) => res.json({ data: await service.read(req.user) }),
  update: async (req, res) => res.json({ data: await service.update(req.user, req.body) }),
});
