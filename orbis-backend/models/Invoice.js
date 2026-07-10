const mongoose = require('mongoose');

const InvoiceItemSchema = new mongoose.Schema({
  description: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 1, default: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  tva: { type: Number, default: 0 } // Taux TVA en % (ex: 18, 0)
}, { _id: false });

const InvoiceSchema = new mongoose.Schema({
  // Numéro de facture auto-généré (ex: FAC-2026-0001)
  numero: { type: String, required: true, unique: true },
  
  // Client
  clientName: { type: String, required: true, trim: true },
  clientCompany: { type: String, trim: true },
  clientEmail: { type: String, trim: true },
  clientPhone: { type: String, trim: true },
  clientAddress: { type: String, trim: true },
  
  // Articles
  items: { type: [InvoiceItemSchema], default: [] },
  
  // Montants
  subTotal: { type: Number, required: true, min: 0 },
  tvaTotal: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  total: { type: Number, required: true, min: 0 },
  
  // Statut
  status: {
    type: String,
    enum: ['brouillon', 'envoyé', 'payé', 'partiel', 'annulé', 'impayé'],
    default: 'brouillon'
  },
  
  // Dates
  issueDate: { type: Date, default: Date.now },
  dueDate: { type: Date, required: true },
  paidAt: { type: Date },
  paidAmount: { type: Number, default: 0 },
  
  // Relations
  dealId: { type: mongoose.Schema.Types.ObjectId, ref: 'Deal' },
  contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Notes
  notes: { type: String, trim: true },
  
  // PDF généré (stocké en base64 ou URL)
  pdfUrl: { type: String }

}, { timestamps: true });

InvoiceSchema.index({ numero: 1 });
InvoiceSchema.index({ createdBy: 1, status: 1 });
InvoiceSchema.index({ dealId: 1 });
InvoiceSchema.index({ status: 1, dueDate: 1 });

// Générateur de numéro de facture
InvoiceSchema.statics.generateNumero = async function () {
  const year = new Date().getFullYear();
  const last = await this.findOne({ numero: new RegExp(`^FAC-${year}-`) })
    .sort({ numero: -1 })
    .lean();
  let nextNum = 1;
  if (last) {
    const parts = last.numero.split('-');
    nextNum = parseInt(parts[2]) + 1;
  }
  return `FAC-${year}-${String(nextNum).padStart(4, '0')}`;
};

module.exports = mongoose.model('Invoice', InvoiceSchema);
