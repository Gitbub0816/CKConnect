export type ExternalCustomer = {
  localId: string;
  name: string;
  email?: string;
};

export type ExternalInvoice = {
  localId: string;
  customerId: string;
  number: string;
  amount: string;
  currency: string;
};

export interface AccountingProvider {
  readonly name: "clearkey" | "quickbooks";
  createCustomer(customer: ExternalCustomer): Promise<{ externalId: string }>;
  updateCustomer(externalId: string, customer: ExternalCustomer): Promise<void>;
  createInvoice(invoice: ExternalInvoice): Promise<{ externalId: string }>;
  recordPayment(input: { invoiceExternalId: string; amount: string; currency: string }): Promise<{ externalId: string }>;
  sync(): Promise<{ processed: number; failed: number }>;
}
