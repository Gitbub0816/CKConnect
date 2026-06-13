export type PayrollEmployeeInput = {
  localId: string;
  firstName: string;
  lastName: string;
  email?: string;
  employmentType: string;
};

export type PayrollRunResult = {
  providerPayrollId: string;
  status: string;
  grossPay: string;
  netPay: string;
};

export interface PayrollProvider {
  readonly name: "check" | "finch";
  getEmployees(): Promise<PayrollEmployeeInput[]>;
  createEmployee(employee: PayrollEmployeeInput): Promise<{ providerEmployeeId: string }>;
  updateEmployee(providerEmployeeId: string, employee: PayrollEmployeeInput): Promise<void>;
  terminateEmployee(providerEmployeeId: string, terminationDate: string): Promise<void>;
  getPayrollRuns(): Promise<PayrollRunResult[]>;
  calculatePayroll(input: { payPeriodStart: string; payPeriodEnd: string }): Promise<PayrollRunResult>;
  submitPayroll(providerPayrollId: string): Promise<PayrollRunResult>;
  getPayStubs(providerPayrollId: string): Promise<Array<{ employeeId: string; documentUrl?: string }>>;
  getTaxDocuments(taxYear: number): Promise<Array<{ employeeId: string; type: string; documentUrl?: string }>>;
  sync(): Promise<{ processed: number; failed: number }>;
}

export const payrollBackgroundJobs = [
  "payroll-sync",
  "payroll-webhook",
  "payroll-history-import",
  "payroll-tax-document-import",
  "payroll-employee-import",
  "payroll-status-update",
] as const;
