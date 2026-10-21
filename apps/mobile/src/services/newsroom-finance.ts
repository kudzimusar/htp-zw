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
  NewsroomFinanceStatements
} from "../domain/models";
import { getStagingSupabaseClient } from "../platform/supabase";

export function mapCustomer(raw: Record<string, unknown>): NewsroomCustomer {
  return {
    id: String(raw.id ?? ""),
    advertiserId: raw.advertiser_id ? String(raw.advertiser_id) : null,
    name: String(raw.name ?? "Unnamed Customer"),
    legalName: raw.legal_name ? String(raw.legal_name) : null,
    billingEmail: String(raw.billing_email ?? ""),
    billingPhone: raw.billing_phone ? String(raw.billing_phone) : null,
    billingAddress: raw.billing_address ? String(raw.billing_address) : null,
    taxNumber: raw.tax_number ? String(raw.tax_number) : null,
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
    taxAmount: Number(raw.tax_amount ?? 0),
    discountAmount: Number(raw.discount_amount ?? 0),
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
    paymentMethod: String(raw.payment_method ?? "bank_transfer"),
    reference: raw.reference ? String(raw.reference) : null,
    notes: raw.notes ? String(raw.notes) : null,
    recordedBy: raw.recorded_by ? String(raw.recorded_by) : null,
    recordedByName: raw.recorded_by_name ? String(raw.recorded_by_name) : null,
    createdAt: String(raw.created_at ?? new Date().toISOString())
  };
}

export function mapExpenseItem(raw: Record<string, unknown>): NewsroomExpenseItem {
  return {
    id: String(raw.id ?? ""),
    expenseNumber: String(raw.expense_number ?? ""),
    expenseDate: String(raw.expense_date ?? new Date().toISOString().slice(0, 10)),
    vendorName: String(raw.vendor_name ?? ""),
    category: String(raw.category ?? ""),
    description: String(raw.description ?? ""),
    department: raw.department ? String(raw.department) : null,
    storyId: raw.story_id ? String(raw.story_id) : null,
    amount: Number(raw.amount ?? 0),
    currency: String(raw.currency ?? "USD"),
    taxAmount: Number(raw.tax_amount ?? 0),
    receiptReference: raw.receipt_reference ? String(raw.receipt_reference) : null,
    receiptUrl: raw.receipt_url ? String(raw.receipt_url) : null,
    status: String(raw.status ?? "draft"),
    paymentStatus: String(raw.payment_status ?? "unpaid"),
    paidAt: raw.paid_at ? String(raw.paid_at) : null,
    paymentReference: raw.payment_reference ? String(raw.payment_reference) : null,
    rejectionReason: raw.rejection_reason ? String(raw.rejection_reason) : null,
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
      totalOutstanding: Number(item.total_outstanding ?? 0)
    })),
    customers: customersRaw.map((item: Record<string, unknown>) => ({
      customerId: String(item.customer_id ?? ""),
      customerName: String(item.customer_name ?? "Unknown"),
      currency: String(item.currency ?? "USD"),
      notDue: Number(item.not_due ?? 0),
      d1_30: Number(item.d1_30 ?? 0),
      d31_60: Number(item.d31_60 ?? 0),
      d61_90: Number(item.d61_90 ?? 0),
      d90Plus: Number(item.d90_plus ?? 0),
      totalOutstanding: Number(item.total_outstanding ?? 0),
      invoiceCount: Number(item.invoice_count ?? 0)
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
        p_start_date: startDate ?? null,
        p_end_date: endDate ?? null
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
      const { data, error } = await client.rpc("finance_record_payment", {
        p_invoice_id: input.invoiceId,
        p_amount: input.amount,
        p_currency: input.currency,
        p_payment_date: input.paymentDate ?? null,
        p_payment_method: input.paymentMethod,
        p_reference: input.reference ?? null,
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
      const { data, error } = await client.rpc("finance_list_payments", {
        p_invoice_id: invoiceId ?? null
      });
      if (error) {
        throw new Error(`Failed to list payments: ${error.message} (code ${error.code})`);
      }
      const list = Array.isArray(data) ? data : [];
      return list.map((item) => mapPaymentItem(item as Record<string, unknown>));
    },

    async listExpenses(statusFilter?: string | null): Promise<NewsroomExpenseItem[]> {
      const client = getClient();
      const { data, error } = await client.rpc("finance_list_expenses", {
        p_status: statusFilter ?? null
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
        p_expense_date: input.expenseDate ?? null,
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
        p_expense_id: expenseId,
        p_payment_reference: reference ?? null
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
        p_status: statusFilter ?? null
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
        p_tax_amount: input.taxAmount ?? 0,
        p_discount_amount: input.discountAmount ?? 0,
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
        p_name: input.name,
        p_legal_name: input.legalName ?? null,
        p_billing_email: input.billingEmail,
        p_billing_phone: input.billingPhone ?? null,
        p_billing_address: input.billingAddress ?? null,
        p_tax_number: input.taxNumber ?? null,
        p_currency: input.currency ?? "USD",
        p_payment_terms_days: input.paymentTermsDays ?? 30,
        p_metadata: input.metadata ?? {}
      });
      if (error) {
        throw new Error(`Failed to upsert customer: ${error.message} (code ${error.code})`);
      }
      return mapCustomer((data as Record<string, unknown>) ?? {});
    }
  };
}

export const stagingNewsroomFinanceService = createNewsroomFinanceService(getStagingSupabaseClient);
