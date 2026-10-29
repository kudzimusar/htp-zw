import type { SupabaseClient } from "@supabase/supabase-js";
import type { NewsroomFinanceService } from "../domain/contracts";
import type {
  NewsroomCustomer,
  NewsroomUpsertCustomerInput,
  NewsroomCommercialOrder,
  NewsroomCreateOrderInput,
  NewsroomInvoiceItem,
  NewsroomInvoiceDetail,
  NewsroomInvoiceLine,
  NewsroomCreateInvoiceInput,
  NewsroomPaymentItem,
  NewsroomRecordPaymentInput,
  NewsroomPaymentResult,
  NewsroomReceivablesAging,
  NewsroomExpenseItem,
  NewsroomExpenseCategory,
  NewsroomCreateExpenseInput,
  NewsroomFinanceOverview,
  NewsroomFinanceStatements,
  NewsroomChartOfAccount,
  NewsroomFiscalPeriod,
  NewsroomJournalLine,
  NewsroomJournalEntry,
  NewsroomCreditNote,
  NewsroomTrialBalance,
  NewsroomProfitAndLoss,
  NewsroomBalanceSheet,
  NewsroomCustomerStatement
} from "../domain/models";
import { getStagingSupabaseClient } from "../platform/supabase";

export function mapCustomer(raw: Record<string, unknown>): NewsroomCustomer {
  return {
    id: String(raw.id ?? ""),
    advertiserId: raw.advertiser_id ? String(raw.advertiser_id) : null,
    name: String(raw.name ?? raw.trading_name ?? raw.legal_name ?? "Unnamed Customer"),
    legalName: raw.legal_name ? String(raw.legal_name) : (raw.name ? String(raw.name) : null),
    billingEmail: String(raw.billing_email ?? ""),
    billingPhone: raw.billing_phone ? String(raw.billing_phone) : null,
    billingAddress: raw.billing_address ? String(raw.billing_address) : null,
    taxNumber: raw.tax_number ? String(raw.tax_number) : (raw.tax_identifier ? String(raw.tax_identifier) : null),
    currency: String(raw.currency ?? "USD"),
    paymentTermsDays: Number(raw.payment_terms_days ?? 30),
    status: String(raw.status ?? "active"),
    metadata: (raw.metadata && typeof raw.metadata === "object") ? raw.metadata as Record<string, unknown> : {},
    createdAt: String(raw.created_at ?? new Date().toISOString()),
    updatedAt: String(raw.updated_at ?? new Date().toISOString())
  };
}

export function mapCommercialOrder(raw: Record<string, unknown>): NewsroomCommercialOrder {
  return {
    id: String(raw.id ?? ""),
    orderNumber: String(raw.order_number ?? ""),
    customerId: String(raw.customer_id ?? ""),
    customerName: raw.customer_name ? String(raw.customer_name) : undefined,
    campaignId: raw.campaign_id ? String(raw.campaign_id) : null,
    campaignName: raw.campaign_name ? String(raw.campaign_name) : null,
    startDate: raw.start_date ? String(raw.start_date) : null,
    endDate: raw.end_date ? String(raw.end_date) : null,
    currency: String(raw.currency ?? "USD"),
    subtotal: Number(raw.subtotal ?? 0),
    taxAmount: Number(raw.tax_amount ?? raw.tax_total ?? 0),
    discountAmount: Number(raw.discount_amount ?? raw.discount_total ?? 0),
    total: Number(raw.total ?? 0),
    status: String(raw.status ?? "draft"),
    billingStatus: String(raw.billing_status ?? "unbilled"),
    notes: raw.notes ? String(raw.notes) : null,
    submittedBy: raw.submitted_by ? String(raw.submitted_by) : null,
    approvedBy: raw.approved_by ? String(raw.approved_by) : null,
    approvedAt: raw.approved_at ? String(raw.approved_at) : null,
    createdAt: String(raw.created_at ?? new Date().toISOString()),
    updatedAt: String(raw.updated_at ?? new Date().toISOString())
  };
}

export function mapInvoiceLine(raw: Record<string, unknown>): NewsroomInvoiceLine {
  return {
    id: raw.id ? String(raw.id) : undefined,
    lineNumber: raw.line_number ? Number(raw.line_number) : undefined,
    description: String(raw.description ?? ""),
    category: raw.category ? String(raw.category) : null,
    placement: raw.placement ? String(raw.placement) : null,
    quantity: Number(raw.quantity ?? 1),
    unitPrice: Number(raw.unit_price ?? 0),
    taxRate: Number(raw.tax_rate ?? 0),
    discount: Number(raw.discount ?? 0),
    lineTotal: Number(raw.line_total ?? 0),
    metadata: (raw.metadata && typeof raw.metadata === "object") ? raw.metadata as Record<string, unknown> : {}
  };
}

export function mapInvoiceItem(raw: Record<string, unknown>): NewsroomInvoiceItem {
  return {
    id: String(raw.id ?? ""),
    invoiceNumber: String(raw.invoice_number ?? ""),
    customerId: String(raw.customer_id ?? ""),
    customerName: String(raw.customer_name ?? "Unknown Customer"),
    orderId: raw.order_id ? String(raw.order_id) : null,
    orderNumber: raw.order_number ? String(raw.order_number) : null,
    status: String(raw.status ?? "draft"),
    effectiveStatus: String(raw.effective_status ?? raw.status ?? "draft"),
    issueDate: raw.issue_date ? String(raw.issue_date) : null,
    dueDate: raw.due_date ? String(raw.due_date) : null,
    currency: String(raw.currency ?? "USD"),
    subtotal: Number(raw.subtotal ?? 0),
    taxTotal: Number(raw.tax_total ?? 0),
    discountTotal: Number(raw.discount_total ?? 0),
    total: Number(raw.total ?? 0),
    amountPaid: Number(raw.amount_paid ?? 0),
    balanceDue: Number(raw.balance_due ?? 0),
    daysOverdue: Number(raw.days_overdue ?? 0),
    paymentTermsDays: Number(raw.payment_terms_days ?? 30),
    paymentCount: Number(raw.payment_count ?? 0),
    notes: raw.notes ? String(raw.notes) : null,
    createdBy: raw.created_by ? String(raw.created_by) : null,
    approvedBy: raw.approved_by ? String(raw.approved_by) : null,
    approvedAt: raw.approved_at ? String(raw.approved_at) : null,
    createdAt: String(raw.created_at ?? new Date().toISOString()),
    updatedAt: String(raw.updated_at ?? new Date().toISOString())
  };
}

export function mapInvoiceDetail(raw: Record<string, unknown>): NewsroomInvoiceDetail {
  const item = mapInvoiceItem(raw);
  const linesRaw = Array.isArray(raw.lines) ? raw.lines : [];
  const paymentsRaw = Array.isArray(raw.payments) ? raw.payments : [];

  return {
    ...item,
    lines: linesRaw.map((line) => mapInvoiceLine(line as Record<string, unknown>)),
    payments: paymentsRaw.map((payment) => mapPaymentItem(payment as Record<string, unknown>))
  };
}

export function mapPaymentItem(raw: Record<string, unknown>): NewsroomPaymentItem {
  return {
    id: String(raw.id ?? ""),
    paymentNumber: String(raw.payment_number ?? ""),
    invoiceId: String(raw.invoice_id ?? ""),
    invoiceNumber: String(raw.invoice_number ?? ""),
    customerId: String(raw.customer_id ?? ""),
    customerName: String(raw.customer_name ?? "Unknown Customer"),
    amount: Number(raw.amount ?? 0),
    currency: String(raw.currency ?? "USD"),
    paymentDate: String(raw.payment_date ?? new Date().toISOString().slice(0, 10)),
    paymentMethod: String(raw.payment_method ?? raw.method ?? "bank_transfer"),
    reference: raw.reference
      ? String(raw.reference)
      : (raw.provider_reference ? String(raw.provider_reference) : null),
    notes: raw.notes ? String(raw.notes) : null,
    recordedBy: raw.recorded_by
      ? String(raw.recorded_by)
      : (raw.received_by ? String(raw.received_by) : null),
    recordedByName: raw.recorded_by_name ? String(raw.recorded_by_name) : null,
    createdAt: String(raw.created_at ?? new Date().toISOString())
  };
}

export function mapExpenseItem(raw: Record<string, unknown>): NewsroomExpenseItem {
  return {
    id: String(raw.id ?? ""),
    expenseNumber: String(raw.expense_number ?? ""),
    expenseDate: String(raw.expense_date ?? new Date().toISOString().slice(0, 10)),
    vendorName: String(raw.vendor_name ?? raw.vendor ?? ""),
    category: String(raw.category ?? ""),
    description: String(raw.description ?? ""),
    department: raw.department ? String(raw.department) : null,
    storyId: raw.story_id ? String(raw.story_id) : null,
    amount: Number(raw.amount ?? 0),
    currency: String(raw.currency ?? "USD"),
    taxAmount: Number(raw.tax_amount ?? 0),
    receiptReference: raw.receipt_reference
      ? String(raw.receipt_reference)
      : (raw.document_ref ? String(raw.document_ref) : null),
    receiptUrl: raw.receipt_url ? String(raw.receipt_url) : null,
    status: String(raw.status ?? "draft"),
    paymentStatus: String(raw.payment_status ?? "unpaid"),
    paidAt: raw.paid_at ? String(raw.paid_at) : null,
    paymentReference: raw.payment_reference ? String(raw.payment_reference) : null,
    rejectionReason: raw.rejection_reason
      ? String(raw.rejection_reason)
      : (raw.rejected_reason ? String(raw.rejected_reason) : null),
    submittedBy: raw.submitted_by ? String(raw.submitted_by) : null,
    submittedByName: raw.submitted_by_name ? String(raw.submitted_by_name) : null,
    approvedBy: raw.approved_by ? String(raw.approved_by) : null,
    approvedByName: raw.approved_by_name ? String(raw.approved_by_name) : null,
    approvedAt: raw.approved_at ? String(raw.approved_at) : null,
    createdAt: String(raw.created_at ?? new Date().toISOString()),
    updatedAt: String(raw.updated_at ?? new Date().toISOString())
  };
}

export function mapExpenseCategory(raw: Record<string, unknown>): NewsroomExpenseCategory {
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? ""),
    code: String(raw.code ?? ""),
    description: raw.description ? String(raw.description) : null,
    isActive: Boolean(raw.is_active ?? true)
  };
}

export function mapReceivablesAging(raw: Record<string, unknown>): NewsroomReceivablesAging {
  const totalsRaw = Array.isArray(raw.totals) ? raw.totals : [];
  const customersRaw = Array.isArray(raw.customers) ? raw.customers : [];

  return {
    totals: totalsRaw.map((item: Record<string, unknown>) => ({
      currency: String(item.currency ?? "USD"),
      notDue: Number(item.not_due ?? 0),
      d1_30: Number(item.d1_30 ?? 0),
      d31_60: Number(item.d31_60 ?? 0),
      d61_90: Number(item.d61_90 ?? 0),
      d90Plus: Number(item.d90_plus ?? 0),
      totalOutstanding: Number(item.total_outstanding ?? item.total ?? 0)
    })),
    customers: customersRaw.map((item: Record<string, unknown>) => ({
      customerId: String(item.customer_id ?? ""),
      customerName: String(item.customer_name ?? item.legal_name ?? "Unknown"),
      currency: String(item.currency ?? "USD"),
      notDue: Number(item.not_due ?? 0),
      d1_30: Number(item.d1_30 ?? 0),
      d31_60: Number(item.d31_60 ?? 0),
      d61_90: Number(item.d61_90 ?? 0),
      d90Plus: Number(item.d90_plus ?? 0),
      totalOutstanding: Number(item.total_outstanding ?? item.balance ?? item.total ?? 0),
      invoiceCount: Number(item.invoice_count ?? item.open_invoices ?? 0)
    }))
  };
}

export function mapFinanceOverview(raw: Record<string, unknown>): NewsroomFinanceOverview {
  const byCurrRaw = Array.isArray(raw.by_currency) ? raw.by_currency : [];
  const countsRaw = (raw.counts && typeof raw.counts === "object") ? raw.counts as Record<string, unknown> : {};

  return {
    byCurrency: byCurrRaw.map((item: Record<string, unknown>) => ({
      currency: String(item.currency ?? "USD"),
      invoicedTotal: Number(item.invoiced_total ?? 0),
      revenueCollected: Number(item.revenue_collected ?? 0),
      receivablesOutstanding: Number(item.receivables_outstanding ?? 0),
      receivablesOverdue: Number(item.receivables_overdue ?? 0),
      expensesApproved: Number(item.expenses_approved ?? 0),
      expensesPaid: Number(item.expenses_paid ?? 0),
      operatingCashNet: Number(item.operating_cash_net ?? 0),
      openInvoicesCount: Number(item.open_invoices_count ?? 0),
      overdueInvoicesCount: Number(item.overdue_invoices_count ?? 0)
    })),
    counts: {
      openInvoices: Number(countsRaw.open_invoices ?? 0),
      overdueInvoices: Number(countsRaw.overdue_invoices ?? 0),
      pendingExpenses: Number(countsRaw.pending_expenses ?? 0),
      approvedUnpaidExpenses: Number(countsRaw.approved_unpaid_expenses ?? 0),
      activeCustomers: Number(countsRaw.active_customers ?? 0),
      pendingOrders: Number(countsRaw.pending_orders ?? 0)
    }
  };
}

export function mapFinanceStatements(raw: Record<string, unknown>): NewsroomFinanceStatements {
  const periodRaw = (raw.period && typeof raw.period === "object") ? raw.period as Record<string, unknown> : {};
  const incomeRaw = Array.isArray(raw.income_statement) ? raw.income_statement : [];
  const revByPlacementRaw = Array.isArray(raw.revenue_by_placement) ? raw.revenue_by_placement : [];
  const receiptsRaw = Array.isArray(raw.cash_receipts) ? raw.cash_receipts : [];
  const expenseSummaryRaw = Array.isArray(raw.expense_summary) ? raw.expense_summary : [];

  return {
    period: {
      startDate: String(periodRaw.start_date ?? ""),
      endDate: String(periodRaw.end_date ?? "")
    },
    balanceSheet: String(raw.balance_sheet ?? "NOT AVAILABLE UNTIL GENERAL LEDGER AUTHORITY EXISTS"),
    incomeStatement: incomeRaw.map((item: Record<string, unknown>) => ({
      currency: String(item.currency ?? "USD"),
      revenue: Number(item.revenue ?? 0),
      expenses: Number(item.expenses ?? 0),
      netOperatingSurplus: Number(item.net_operating_surplus ?? 0)
    })),
    revenueByPlacement: revByPlacementRaw.map((item: Record<string, unknown>) => ({
      placement: String(item.placement ?? "general"),
      currency: String(item.currency ?? "USD"),
      revenue: Number(item.revenue ?? 0)
    })),
    cashReceipts: receiptsRaw.map((item: Record<string, unknown>) => ({
      method: String(item.method ?? "unknown"),
      currency: String(item.currency ?? "USD"),
      totalAmount: Number(item.total_amount ?? 0),
      receiptsCount: Number(item.receipts_count ?? 0)
    })),
    expenseSummary: expenseSummaryRaw.map((item: Record<string, unknown>) => ({
      category: String(item.category ?? "general"),
      currency: String(item.currency ?? "USD"),
      totalAmount: Number(item.total_amount ?? 0),
      count: Number(item.count ?? 0)
    }))
  };
}

export function mapChartOfAccount(raw: Record<string, unknown>): NewsroomChartOfAccount {
  return {
    id: String(raw.id ?? ""),
    accountCode: String(raw.account_code ?? ""),
    accountName: String(raw.account_name ?? ""),
    accountType: (raw.account_type as NewsroomChartOfAccount["accountType"]) ?? "ASSET",
    description: raw.description ? String(raw.description) : null,
    isActive: Boolean(raw.is_active ?? true),
    currency: String(raw.currency ?? "USD"),
    createdAt: String(raw.created_at ?? new Date().toISOString())
  };
}

export function mapFiscalPeriod(raw: Record<string, unknown>): NewsroomFiscalPeriod {
  return {
    id: String(raw.id ?? ""),
    periodName: String(raw.period_name ?? ""),
    startDate: String(raw.start_date ?? ""),
    endDate: String(raw.end_date ?? ""),
    status: (raw.status as NewsroomFiscalPeriod["status"]) ?? "OPEN",
    lockedAt: raw.locked_at ? String(raw.locked_at) : null,
    lockedBy: raw.locked_by ? String(raw.locked_by) : null,
    createdAt: String(raw.created_at ?? new Date().toISOString())
  };
}

export function mapJournalLine(raw: Record<string, unknown>): NewsroomJournalLine {
  return {
    id: raw.id ? String(raw.id) : undefined,
    lineNumber: Number(raw.line_number ?? 1),
    accountId: String(raw.account_id ?? ""),
    accountCode: raw.account_code ? String(raw.account_code) : undefined,
    accountName: raw.account_name ? String(raw.account_name) : undefined,
    debit: Number(raw.debit ?? 0),
    credit: Number(raw.credit ?? 0),
    description: String(raw.description ?? ""),
    createdAt: raw.created_at ? String(raw.created_at) : undefined
  };
}

export function mapJournalEntry(raw: Record<string, unknown>): NewsroomJournalEntry {
  const linesRaw = Array.isArray(raw.lines) ? raw.lines : [];
  return {
    id: String(raw.id ?? ""),
    entryNumber: String(raw.entry_number ?? ""),
    entryDate: String(raw.entry_date ?? ""),
    periodId: raw.period_id ? String(raw.period_id) : null,
    status: (raw.status as NewsroomJournalEntry["status"]) ?? "draft",
    source: (raw.source as NewsroomJournalEntry["source"]) ?? "manual",
    sourceId: raw.source_id ? String(raw.source_id) : null,
    currency: String(raw.currency ?? "USD"),
    memo: String(raw.memo ?? ""),
    postedAt: raw.posted_at ? String(raw.posted_at) : null,
    createdAt: String(raw.created_at ?? new Date().toISOString()),
    lines: linesRaw.map((line) => mapJournalLine(line as Record<string, unknown>))
  };
}

export function mapCreditNote(raw: Record<string, unknown>): NewsroomCreditNote {
  return {
    id: String(raw.id ?? ""),
    creditNoteNumber: String(raw.credit_note_number ?? ""),
    customerId: String(raw.customer_id ?? ""),
    customerName: raw.customer_name ? String(raw.customer_name) : undefined,
    invoiceId: String(raw.invoice_id ?? ""),
    invoiceNumber: raw.invoice_number ? String(raw.invoice_number) : undefined,
    amount: Number(raw.amount ?? 0),
    currency: String(raw.currency ?? "USD"),
    reason: String(raw.reason ?? ""),
    status: (raw.status as NewsroomCreditNote["status"]) ?? "issued",
    issuedAt: String(raw.issued_at ?? raw.created_at ?? new Date().toISOString()),
    issuedBy: raw.issued_by ? String(raw.issued_by) : null,
    createdAt: String(raw.created_at ?? new Date().toISOString())
  };
}

export function mapTrialBalance(raw: Record<string, unknown>): NewsroomTrialBalance {
  const accountsRaw = Array.isArray(raw.accounts) ? raw.accounts : [];
  return {
    periodId: raw.period_id ? String(raw.period_id) : null,
    currency: String(raw.currency ?? "USD"),
    accounts: accountsRaw.map((acc: Record<string, unknown>) => ({
      accountId: String(acc.account_id ?? ""),
      accountCode: String(acc.account_code ?? ""),
      accountName: String(acc.account_name ?? ""),
      accountType: (acc.account_type as NewsroomChartOfAccount["accountType"]) ?? "ASSET",
      debitTotal: Number(acc.debit_total ?? 0),
      creditTotal: Number(acc.credit_total ?? 0),
      netBalance: Number(acc.net_balance ?? 0)
    })),
    totalDebits: Number(raw.total_debits ?? 0),
    totalCredits: Number(raw.total_credits ?? 0),
    isBalanced: Boolean(raw.is_balanced ?? false)
  };
}

export function mapProfitAndLoss(raw: Record<string, unknown>): NewsroomProfitAndLoss {
  const revenuesRaw = Array.isArray(raw.revenues) ? raw.revenues : [];
  const expensesRaw = Array.isArray(raw.expenses) ? raw.expenses : [];
  return {
    fromDate: String(raw.from_date ?? ""),
    toDate: String(raw.to_date ?? ""),
    currency: String(raw.currency ?? "USD"),
    revenues: revenuesRaw.map((rev: Record<string, unknown>) => ({
      accountCode: String(rev.account_code ?? ""),
      accountName: String(rev.account_name ?? ""),
      amount: Number(rev.amount ?? 0)
    })),
    totalRevenue: Number(raw.total_revenue ?? 0),
    expenses: expensesRaw.map((exp: Record<string, unknown>) => ({
      accountCode: String(exp.account_code ?? ""),
      accountName: String(exp.account_name ?? ""),
      amount: Number(exp.amount ?? 0)
    })),
    totalExpenses: Number(raw.total_expenses ?? 0),
    netOperatingSurplus: Number(raw.net_operating_surplus ?? 0)
  };
}

export function mapBalanceSheet(raw: Record<string, unknown>): NewsroomBalanceSheet {
  const assetsRaw = Array.isArray(raw.assets) ? raw.assets : [];
  const liabilitiesRaw = Array.isArray(raw.liabilities) ? raw.liabilities : [];
  const equityRaw = Array.isArray(raw.equity) ? raw.equity : [];
  return {
    asOfDate: String(raw.as_of_date ?? ""),
    currency: String(raw.currency ?? "USD"),
    assets: assetsRaw.map((a: Record<string, unknown>) => ({
      accountCode: String(a.account_code ?? ""),
      accountName: String(a.account_name ?? ""),
      amount: Number(a.amount ?? 0)
    })),
    totalAssets: Number(raw.total_assets ?? 0),
    liabilities: liabilitiesRaw.map((l: Record<string, unknown>) => ({
      accountCode: String(l.account_code ?? ""),
      accountName: String(l.account_name ?? ""),
      amount: Number(l.amount ?? 0)
    })),
    totalLiabilities: Number(raw.total_liabilities ?? 0),
    equity: equityRaw.map((e: Record<string, unknown>) => ({
      accountCode: String(e.account_code ?? ""),
      accountName: String(e.account_name ?? ""),
      amount: Number(e.amount ?? 0)
    })),
    totalEquity: Number(raw.total_equity ?? 0),
    totalLiabilitiesAndEquity: Number(raw.total_liabilities_and_equity ?? 0),
    isBalanced: Boolean(raw.is_balanced ?? false)
  };
}

export function mapCustomerStatement(raw: Record<string, unknown>): NewsroomCustomerStatement {
  const activityRaw = Array.isArray(raw.activity) ? raw.activity : [];
  return {
    customerId: String(raw.customer_id ?? ""),
    customerName: String(raw.customer_name ?? ""),
    currency: String(raw.currency ?? "USD"),
    fromDate: String(raw.from_date ?? ""),
    toDate: String(raw.to_date ?? ""),
    openingBalance: Number(raw.opening_balance ?? 0),
    totalInvoiced: Number(raw.total_invoiced ?? 0),
    totalPaid: Number(raw.total_paid ?? 0),
    totalCredits: Number(raw.total_credits ?? 0),
    closingBalance: Number(raw.closing_balance ?? 0),
    activity: activityRaw.map((act: Record<string, unknown>) => ({
      type: (act.type as "invoice" | "payment" | "credit_note") ?? "invoice",
      reference: String(act.reference ?? ""),
      activityDate: String(act.activity_date ?? ""),
      amount: Number(act.amount ?? 0),
      memo: String(act.memo ?? "")
    }))
  };
}

export function createNewsroomFinanceService(
  clientProvider: () => SupabaseClient = getStagingSupabaseClient
): NewsroomFinanceService {
  function getClient(): SupabaseClient {
    return clientProvider();
  }

  return {
    async getOverview(): Promise<NewsroomFinanceOverview> {
      const client = getClient();
      const { data, error } = await client.rpc("finance_overview");
      if (error) {
        throw new Error(`Failed to load finance overview: ${error.message} (code ${error.code})`);
      }
      return mapFinanceOverview((data as Record<string, unknown>) ?? {});
    },

    async getStatements(startDate?: string, endDate?: string): Promise<NewsroomFinanceStatements> {
      const client = getClient();
      const { data, error } = await client.rpc("finance_statements", {
        p_from: startDate ?? null,
        p_to: endDate ?? null
      });
      if (error) {
        throw new Error(`Failed to load financial statements: ${error.message} (code ${error.code})`);
      }
      return mapFinanceStatements((data as Record<string, unknown>) ?? {});
    },

    async getReceivablesAging(): Promise<NewsroomReceivablesAging> {
      const client = getClient();
      const { data, error } = await client.rpc("finance_receivables_aging");
      if (error) {
        throw new Error(`Failed to load receivables aging: ${error.message} (code ${error.code})`);
      }
      return mapReceivablesAging((data as Record<string, unknown>) ?? {});
    },

    async listInvoices(statusFilter?: string | null): Promise<NewsroomInvoiceItem[]> {
      const client = getClient();
      const { data, error } = await client.rpc("finance_list_invoices", {
        p_status: statusFilter ?? null
      });
      if (error) {
        throw new Error(`Failed to list invoices: ${error.message} (code ${error.code})`);
      }
      const list = Array.isArray(data) ? data : [];
      return list.map((item) => mapInvoiceItem(item as Record<string, unknown>));
    },

    async getInvoice(invoiceId: string): Promise<NewsroomInvoiceDetail> {
      const client = getClient();
      const { data, error } = await client.rpc("finance_get_invoice", {
        p_invoice_id: invoiceId
      });
      if (error) {
        throw new Error(`Failed to get invoice ${invoiceId}: ${error.message} (code ${error.code})`);
      }
      return mapInvoiceDetail((data as Record<string, unknown>) ?? {});
    },

    async createInvoice(input: NewsroomCreateInvoiceInput): Promise<NewsroomInvoiceDetail> {
      const client = getClient();
      const { data, error } = await client.rpc("finance_create_invoice", {
        p_customer_id: input.customerId,
        p_order_id: input.orderId ?? null,
        p_issue_date: input.issueDate ?? null,
        p_due_date: input.dueDate ?? null,
        p_currency: input.currency ?? "USD",
        p_lines: input.lines,
        p_notes: input.notes ?? null,
        p_terms: input.terms ?? null
      });
      if (error) {
        throw new Error(`Failed to create invoice: ${error.message} (code ${error.code})`);
      }
      return mapInvoiceDetail((data as Record<string, unknown>) ?? {});
    },

    async approveInvoice(invoiceId: string): Promise<void> {
      const client = getClient();
      const { error } = await client.rpc("finance_approve_invoice", {
        p_invoice_id: invoiceId
      });
      if (error) {
        throw new Error(`Failed to approve invoice ${invoiceId}: ${error.message} (code ${error.code})`);
      }
    },

    async issueInvoice(invoiceId: string, issueDate?: string, dueDate?: string): Promise<void> {
      const client = getClient();
      const { error } = await client.rpc("finance_issue_invoice", {
        p_invoice_id: invoiceId,
        p_issue_date: issueDate ?? null,
        p_due_date: dueDate ?? null
      });
      if (error) {
        throw new Error(`Failed to issue invoice ${invoiceId}: ${error.message} (code ${error.code})`);
      }
    },

    async voidInvoice(invoiceId: string, reason: string): Promise<void> {
      const client = getClient();
      const { error } = await client.rpc("finance_void_invoice", {
        p_invoice_id: invoiceId,
        p_reason: reason
      });
      if (error) {
        throw new Error(`Failed to void invoice ${invoiceId}: ${error.message} (code ${error.code})`);
      }
    },

    async recordPayment(input: NewsroomRecordPaymentInput): Promise<NewsroomPaymentResult> {
      const client = getClient();
      const canonicalMethod = input.paymentMethod === "ecocash"
        ? "mobile_money"
        : input.paymentMethod === "stripe"
          ? "card"
          : input.paymentMethod;
      const { data, error } = await client.rpc("finance_record_payment", {
        p_invoice_id: input.invoiceId,
        p_amount: input.amount,
        p_currency: input.currency,
        p_payment_date: input.paymentDate ?? new Date().toISOString().slice(0, 10),
        p_method: canonicalMethod,
        p_provider_reference: input.reference ?? null,
        p_notes: input.notes ?? null,
        p_idempotency_key: input.idempotencyKey ?? null
      });
      if (error) {
        throw new Error(`Failed to record payment: ${error.message} (code ${error.code})`);
      }
      const raw = (data as Record<string, unknown>) ?? {};
      return {
        id: String(raw.id ?? ""),
        paymentNumber: String(raw.payment_number ?? ""),
        invoiceId: String(raw.invoice_id ?? input.invoiceId),
        amount: Number(raw.amount ?? input.amount),
        currency: String(raw.currency ?? input.currency),
        replayed: Boolean(raw.replayed ?? false),
        status: String(raw.status ?? "recorded"),
        balanceDue: Number(raw.balance_due ?? 0)
      };
    },

    async listPayments(invoiceId?: string): Promise<NewsroomPaymentItem[]> {
      const client = getClient();
      const { data, error } = await client.rpc("finance_list_payments");
      if (error) {
        throw new Error(`Failed to list payments: ${error.message} (code ${error.code})`);
      }
      const list = Array.isArray(data) ? data : [];
      const mapped = list.map((item) => mapPaymentItem(item as Record<string, unknown>));
      return invoiceId ? mapped.filter((payment) => payment.invoiceId === invoiceId) : mapped;
    },

    async listExpenses(statusFilter?: string | null): Promise<NewsroomExpenseItem[]> {
      const client = getClient();
      const { data, error } = await client.rpc("finance_list_expenses", {
        p_status: statusFilter && statusFilter !== "all" ? statusFilter : null
      });
      if (error) {
        throw new Error(`Failed to list expenses: ${error.message} (code ${error.code})`);
      }
      const list = Array.isArray(data) ? data : [];
      return list.map((item) => mapExpenseItem(item as Record<string, unknown>));
    },

    async createExpense(input: NewsroomCreateExpenseInput): Promise<NewsroomExpenseItem> {
      const client = getClient();
      const { data, error } = await client.rpc("finance_create_expense", {
        p_expense_date: input.expenseDate ?? new Date().toISOString().slice(0, 10),
        p_vendor_name: input.vendorName,
        p_category: input.category,
        p_description: input.description,
        p_department: input.department ?? null,
        p_amount: input.amount,
        p_currency: input.currency ?? "USD",
        p_tax_amount: input.taxAmount ?? 0,
        p_receipt_reference: input.receiptReference ?? null,
        p_submit: Boolean(input.submitImmediately ?? true),
        p_story_id: input.storyId ?? null
      });
      if (error) {
        throw new Error(`Failed to create expense: ${error.message} (code ${error.code})`);
      }
      return mapExpenseItem((data as Record<string, unknown>) ?? {});
    },

    async submitExpense(expenseId: string): Promise<void> {
      const client = getClient();
      const { error } = await client.rpc("finance_submit_expense", {
        p_expense_id: expenseId
      });
      if (error) {
        throw new Error(`Failed to submit expense ${expenseId}: ${error.message} (code ${error.code})`);
      }
    },

    async approveExpense(expenseId: string): Promise<void> {
      const client = getClient();
      const { error } = await client.rpc("finance_approve_expense", {
        p_expense_id: expenseId
      });
      if (error) {
        throw new Error(`Failed to approve expense ${expenseId}: ${error.message} (code ${error.code})`);
      }
    },

    async rejectExpense(expenseId: string, reason: string): Promise<void> {
      const client = getClient();
      const { error } = await client.rpc("finance_reject_expense", {
        p_expense_id: expenseId,
        p_reason: reason
      });
      if (error) {
        throw new Error(`Failed to reject expense ${expenseId}: ${error.message} (code ${error.code})`);
      }
    },

    async payExpense(expenseId: string, reference?: string): Promise<void> {
      const client = getClient();
      const { error } = await client.rpc("finance_pay_expense", {
        p_expense_id: expenseId
      });
      if (error) {
        throw new Error(`Failed to pay expense ${expenseId}: ${error.message} (code ${error.code})`);
      }
    },

    async listExpenseCategories(): Promise<NewsroomExpenseCategory[]> {
      const client = getClient();
      const { data, error } = await client.rpc("finance_list_expense_categories");
      if (error) {
        throw new Error(`Failed to list expense categories: ${error.message} (code ${error.code})`);
      }
      const list = Array.isArray(data) ? data : [];
      return list.map((item) => mapExpenseCategory(item as Record<string, unknown>));
    },

    async listOrders(statusFilter?: string | null): Promise<NewsroomCommercialOrder[]> {
      const client = getClient();
      const { data, error } = await client.rpc("commercial_list_orders", {
        p_status: statusFilter && statusFilter !== "all" ? statusFilter : null
      });
      if (error) {
        throw new Error(`Failed to list commercial orders: ${error.message} (code ${error.code})`);
      }
      const list = Array.isArray(data) ? data : [];
      return list.map((item) => mapCommercialOrder(item as Record<string, unknown>));
    },

    async createOrder(input: NewsroomCreateOrderInput): Promise<NewsroomCommercialOrder> {
      const client = getClient();
      const { data, error } = await client.rpc("commercial_create_order", {
        p_customer_id: input.customerId,
        p_campaign_id: input.campaignId ?? null,
        p_start_date: input.startDate ?? null,
        p_end_date: input.endDate ?? null,
        p_currency: input.currency ?? "USD",
        p_subtotal: input.subtotal,
        p_tax: input.taxAmount ?? 0,
        p_discount: input.discountAmount ?? 0,
        p_notes: input.notes ?? null
      });
      if (error) {
        throw new Error(`Failed to create order: ${error.message} (code ${error.code})`);
      }
      return mapCommercialOrder((data as Record<string, unknown>) ?? {});
    },

    async approveOrder(orderId: string): Promise<void> {
      const client = getClient();
      const { error } = await client.rpc("commercial_approve_order", {
        p_order_id: orderId
      });
      if (error) {
        throw new Error(`Failed to approve order ${orderId}: ${error.message} (code ${error.code})`);
      }
    },

    async listCustomers(): Promise<NewsroomCustomer[]> {
      const client = getClient();
      const { data, error } = await client.rpc("finance_list_customers");
      if (error) {
        throw new Error(`Failed to list customers: ${error.message} (code ${error.code})`);
      }
      const list = Array.isArray(data) ? data : [];
      return list.map((item) => mapCustomer(item as Record<string, unknown>));
    },

    async upsertCustomer(input: NewsroomUpsertCustomerInput): Promise<NewsroomCustomer> {
      const client = getClient();
      const { data, error } = await client.rpc("finance_upsert_customer", {
        p_id: input.customerId ?? null,
        p_advertiser_id: input.advertiserId ?? null,
        p_legal_name: input.legalName ?? input.name,
        p_trading_name: input.name ?? input.legalName,
        p_billing_email: input.billingEmail,
        p_billing_phone: input.billingPhone ?? null,
        p_billing_address: input.billingAddress ?? null,
        p_tax_identifier: input.taxNumber ?? null,
        p_currency: input.currency ?? "USD",
        p_payment_terms_days: input.paymentTermsDays ?? 30
      });
      if (error) {
        throw new Error(`Failed to upsert customer: ${error.message} (code ${error.code})`);
      }
      return mapCustomer((data as Record<string, unknown>) ?? {});
    },

    async getTrialBalance(periodId?: string | null, currency?: string): Promise<NewsroomTrialBalance> {
      const client = getClient();
      const { data, error } = await client.rpc("finance_get_trial_balance", {
        p_period_id: periodId ?? null,
        p_currency: currency ?? "USD"
      });
      if (error) {
        throw new Error(`Failed to get trial balance: ${error.message} (code ${error.code})`);
      }
      return mapTrialBalance((data as Record<string, unknown>) ?? {});
    },

    async getProfitAndLoss(fromDate?: string | null, toDate?: string | null, currency?: string): Promise<NewsroomProfitAndLoss> {
      const client = getClient();
      const { data, error } = await client.rpc("finance_get_profit_and_loss", {
        p_from_date: fromDate ?? null,
        p_to_date: toDate ?? null,
        p_currency: currency ?? "USD"
      });
      if (error) {
        throw new Error(`Failed to get profit and loss statement: ${error.message} (code ${error.code})`);
      }
      return mapProfitAndLoss((data as Record<string, unknown>) ?? {});
    },

    async getBalanceSheet(asOfDate?: string | null, currency?: string): Promise<NewsroomBalanceSheet> {
      const client = getClient();
      const { data, error } = await client.rpc("finance_get_balance_sheet", {
        p_as_of_date: asOfDate ?? null,
        p_currency: currency ?? "USD"
      });
      if (error) {
        throw new Error(`Failed to get balance sheet: ${error.message} (code ${error.code})`);
      }
      return mapBalanceSheet((data as Record<string, unknown>) ?? {});
    },

    async getCustomerStatement(customerId: string, fromDate?: string | null, toDate?: string | null, currency?: string): Promise<NewsroomCustomerStatement> {
      const client = getClient();
      const { data, error } = await client.rpc("finance_get_customer_statement", {
        p_customer_id: customerId,
        p_from_date: fromDate ?? null,
        p_to_date: toDate ?? null,
        p_currency: currency ?? "USD"
      });
      if (error) {
        throw new Error(`Failed to get customer statement: ${error.message} (code ${error.code})`);
      }
      return mapCustomerStatement((data as Record<string, unknown>) ?? {});
    },

    async createCreditNote(invoiceId: string, amount: number, reason: string): Promise<{ id: string; creditNoteNumber: string; amount: number }> {
      const client = getClient();
      const { data, error } = await client.rpc("finance_create_credit_note", {
        p_invoice_id: invoiceId,
        p_amount: amount,
        p_reason: reason
      });
      if (error) {
        throw new Error(`Failed to create credit note: ${error.message} (code ${error.code})`);
      }
      const raw = (data as Record<string, unknown>) ?? {};
      return {
        id: String(raw.id ?? ""),
        creditNoteNumber: String(raw.credit_note_number ?? ""),
        amount: Number(raw.amount ?? amount)
      };
    },

    async reverseJournalEntry(entryId: string, reason: string): Promise<{ id: string; status: string; reversalEntryId: string }> {
      const client = getClient();
      const { data, error } = await client.rpc("finance_reverse_journal_entry", {
        p_entry_id: entryId,
        p_reason: reason
      });
      if (error) {
        throw new Error(`Failed to reverse journal entry: ${error.message} (code ${error.code})`);
      }
      const raw = (data as Record<string, unknown>) ?? {};
      return {
        id: String(raw.id ?? entryId),
        status: String(raw.status ?? "reversed"),
        reversalEntryId: String(raw.reversal_entry_id ?? "")
      };
    },

    async listJournals(periodId?: string | null, statusFilter?: string | null, limit?: number): Promise<NewsroomJournalEntry[]> {
      const client = getClient();
      const { data, error } = await client.rpc("finance_list_journal_entries", {
        p_period_id: periodId ?? null,
        p_status: statusFilter ?? null,
        p_limit: limit ?? 100
      });
      if (error) {
        throw new Error(`Failed to list journal entries: ${error.message} (code ${error.code})`);
      }
      const list = Array.isArray(data) ? data : [];
      return list.map((item) => mapJournalEntry(item as Record<string, unknown>));
    },

    async listChartOfAccounts(): Promise<NewsroomChartOfAccount[]> {
      const client = getClient();
      const { data, error } = await client.rpc("finance_list_chart_of_accounts");
      if (error) {
        throw new Error(`Failed to list chart of accounts: ${error.message} (code ${error.code})`);
      }
      const list = Array.isArray(data) ? data : [];
      return list.map((item) => mapChartOfAccount(item as Record<string, unknown>));
    },

    async listFiscalPeriods(): Promise<NewsroomFiscalPeriod[]> {
      const client = getClient();
      const { data, error } = await client.rpc("finance_list_fiscal_periods");
      if (error) {
        throw new Error(`Failed to list fiscal periods: ${error.message} (code ${error.code})`);
      }
      const list = Array.isArray(data) ? data : [];
      return list.map((item) => mapFiscalPeriod(item as Record<string, unknown>));
    }
  };
}

export const stagingNewsroomFinanceService = createNewsroomFinanceService(getStagingSupabaseClient);
