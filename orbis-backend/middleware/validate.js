// Middleware de validation rapide et robuste pour le MVP
const validateContact = (req, res, next) => {
  const { firstName, lastName, phone, email, status } = req.body;
  if (!firstName || !lastName || !phone || !email) {
    return res.status(400).json({ error: "Le prénom, le nom, le téléphone et l'email sont obligatoires." });
  }
  if (status && !['à_contacter', 'en_cours', 'gagné', 'perdu'].includes(status)) {
    return res.status(400).json({ error: "Statut de contact invalide." });
  }
  next();
};

const validateDeal = (req, res, next) => {
  const { title, amount, stage } = req.body;
  if (!title || amount === undefined) {
    return res.status(400).json({ error: "Le titre et le montant du deal sont obligatoires." });
  }
  if (amount < 0) {
    return res.status(400).json({ error: "Le montant ne peut pas être négatif." });
  }
  if (stage && !['découverte', 'proposition', 'négociation', 'gagné', 'perdu'].includes(stage)) {
    return res.status(400).json({ error: "Étape du pipeline invalide." });
  }
  next();
};

const validateInteraction = (req, res, next) => {
  const { type, notes } = req.body;
  if (!type || !notes) {
    return res.status(400).json({ error: "Le type et les notes de l'interaction sont obligatoires." });
  }
  if (!['appel', 'email', 'rdv'].includes(type)) {
    return res.status(400).json({ error: "Type d'interaction invalide (appel, email, rdv acceptés)." });
  }
  next();
};

module.exports = { validateContact, validateDeal, validateInteraction };
