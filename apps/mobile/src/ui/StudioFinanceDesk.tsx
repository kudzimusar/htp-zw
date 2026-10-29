import { useState, useMemo, useEffect } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { services } from "../services";
import { useAsync } from "../hooks/useAsync";
import { colors, radius, spacing } from "../theme/tokens";
import type {
  NewsroomCustomer,
  NewsroomCommercialOrder,
  NewsroomInvoiceItem,
  NewsroomInvoiceDetail,
  NewsroomInvoiceLine,
  NewsroomPaymentItem,
  NewsroomReceivablesAging,
  NewsroomExpenseItem,
  NewsroomExpenseCategory,
  NewsroomFinanceOverview,
  NewsroomFinanceStatements,
  NewsroomTrialBalance,
  NewsroomProfitAndLoss,
  NewsroomBalanceSheet,
  NewsroomCustomerStatement,
  NewsroomJournalEntry,
  NewsroomChartOfAccount,
  NewsroomFiscalPeriod
} from "../domain/models";
import {
  buildPreviewTrialBalance,
  buildPreviewProfitAndLoss,
  buildPreviewBalanceSheet,
  buildPreviewCustomerStatement,
  buildPreviewJournals,
  buildPreviewChartOfAccounts,
  buildPreviewFiscalPeriods
} from "../preview/newsroomPreviewData";
import { getAdvertiserInvoicePaymentOptions } from "../growth/payment-readiness";

export type FinanceTab =
  | "overview"
  | "invoices"
  | "aging"
  | "payments"
  | "expenses"
  | "orders"
  | "customers"
  | "trial-balance"
  | "pnl"
  | "balance-sheet"
  | "journals"
  | "statements";

export function validatePreviewInvoiceInput(input: {
  customerId: string;
  description: string;
  currency: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}): string | null {
  if (!input.customerId.trim()) return "Select a customer.";
  if (!input.description.trim()) return "Enter an invoice description.";
  if (!input.currency.trim()) return "Enter a currency.";
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) return "Quantity must be greater than zero.";
  if (!Number.isFinite(input.unitPrice) || input.unitPrice <= 0) return "Unit price must be greater than zero.";
  if (!Number.isFinite(input.taxRate) || input.taxRate < 0 || input.taxRate > 1) return "Tax rate must be between 0 and 1.";
  const subtotal = input.quantity * input.unitPrice;
  const total = subtotal + subtotal * input.taxRate;
  if (subtotal < 0 || total < 0) return "Invoice totals cannot be negative.";
  return null;
}

interface StudioFinanceDeskProps {
  initialTab?: FinanceTab;
  isOwnerPreview?: boolean;
  defaultExpenseScope?: "all" | "my";
  currentStaffName?: string;
  previewOverview?: NewsroomFinanceOverview;
  previewStatements?: NewsroomFinanceStatements;
  previewAging?: NewsroomReceivablesAging;
  previewInvoices?: NewsroomInvoiceItem[];
  previewPayments?: NewsroomPaymentItem[];
  previewExpenses?: NewsroomExpenseItem[];
  previewOrders?: NewsroomCommercialOrder[];
  previewCustomers?: NewsroomCustomer[];
  previewTrialBalance?: NewsroomTrialBalance;
  previewProfitAndLoss?: NewsroomProfitAndLoss;
  previewBalanceSheet?: NewsroomBalanceSheet;
  previewCustomerStatement?: NewsroomCustomerStatement;
  previewJournals?: NewsroomJournalEntry[];
}

export function StudioFinanceDeskView({
  initialTab = "overview",
  isOwnerPreview = false,
  defaultExpenseScope = "all",
  currentStaffName = "Kudzanai Musarurwa",
  previewOverview,
  previewStatements,
  previewAging,
  previewInvoices = [],
  previewPayments = [],
  previewExpenses = [],
  previewOrders = [],
  previewCustomers = [],
  previewTrialBalance,
  previewProfitAndLoss,
  previewBalanceSheet,
  previewCustomerStatement,
  previewJournals = []
}: StudioFinanceDeskProps) {
  const [activeTab, setActiveTab] = useState<FinanceTab>(initialTab);
  const [currencyFilter, setCurrencyFilter] = useState<string>("USD");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>("all");
  const [expenseScope, setExpenseScope] = useState<"all" | "my">(defaultExpenseScope);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setExpenseScope(defaultExpenseScope);
  }, [defaultExpenseScope]);

  const [localExpenses, setLocalExpenses] = useState<NewsroomExpenseItem[]>(() =>
    isOwnerPreview ? [...previewExpenses] : []
  );
  const [localInvoices, setLocalInvoices] = useState<NewsroomInvoiceItem[]>(() =>
    isOwnerPreview ? [...previewInvoices] : []
  );
  const [localPayments, setLocalPayments] = useState<NewsroomPaymentItem[]>(() =>
    isOwnerPreview ? [...previewPayments] : []
  );
  const [localOrders, setLocalOrders] = useState<NewsroomCommercialOrder[]>(() =>
    isOwnerPreview ? [...previewOrders] : []
  );
  const [localCustomers, setLocalCustomers] = useState<NewsroomCustomer[]>(() =>
    isOwnerPreview ? [...previewCustomers] : []
  );
  const [localJournals, setLocalJournals] = useState<NewsroomJournalEntry[]>(() =>
    isOwnerPreview ? (previewJournals.length > 0 ? [...previewJournals] : buildPreviewJournals()) : []
  );
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modals
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<NewsroomInvoiceItem | null>(null);
  const [inspectedInvoice, setInspectedInvoice] = useState<NewsroomInvoiceItem | null>(null);
  const [inspectedOrder, setInspectedOrder] = useState<NewsroomCommercialOrder | null>(null);

  // Refresh trigger for live staging
  const [refreshKey, setRefreshKey] = useState(0);

  // Live Staging Data Fetching
  const liveOverview = useAsync(
    () => (isOwnerPreview ? Promise.resolve(previewOverview) : services.newsroomFinance.getOverview()),
    [refreshKey, isOwnerPreview]
  );

  const liveInvoices = useAsync(
    () =>
      isOwnerPreview
        ? Promise.resolve(previewInvoices)
        : services.newsroomFinance.listInvoices(invoiceStatusFilter === "all" ? null : invoiceStatusFilter),
    [refreshKey, isOwnerPreview, invoiceStatusFilter]
  );

  const liveAging = useAsync(
    () => (isOwnerPreview ? Promise.resolve(previewAging) : services.newsroomFinance.getReceivablesAging()),
    [refreshKey, isOwnerPreview]
  );

  const livePayments = useAsync(
    () => (isOwnerPreview ? Promise.resolve(previewPayments) : services.newsroomFinance.listPayments()),
    [refreshKey, isOwnerPreview]
  );

  const liveExpenses = useAsync(
    () => (isOwnerPreview ? Promise.resolve(previewExpenses) : services.newsroomFinance.listExpenses()),
    [refreshKey, isOwnerPreview]
  );

  const liveStatements = useAsync(
    () => (isOwnerPreview ? Promise.resolve(previewStatements) : services.newsroomFinance.getStatements()),
    [refreshKey, isOwnerPreview]
  );

  const liveCustomers = useAsync(
    () => (isOwnerPreview ? Promise.resolve(previewCustomers) : services.newsroomFinance.listCustomers()),
    [refreshKey, isOwnerPreview]
  );

  const liveOrders = useAsync(
    () => (isOwnerPreview ? Promise.resolve(previewOrders) : services.newsroomFinance.listOrders()),
    [refreshKey, isOwnerPreview]
  );

  const liveTrialBalance = useAsync(
    () => (isOwnerPreview ? Promise.resolve(previewTrialBalance ?? buildPreviewTrialBalance()) : services.newsroomFinance.getTrialBalance()),
    [refreshKey, isOwnerPreview]
  );

  const liveProfitAndLoss = useAsync(
    () => (isOwnerPreview ? Promise.resolve(previewProfitAndLoss ?? buildPreviewProfitAndLoss()) : services.newsroomFinance.getProfitAndLoss()),
    [refreshKey, isOwnerPreview]
  );

  const liveBalanceSheet = useAsync(
    () => (isOwnerPreview ? Promise.resolve(previewBalanceSheet ?? buildPreviewBalanceSheet()) : services.newsroomFinance.getBalanceSheet()),
    [refreshKey, isOwnerPreview]
  );

  const liveJournals = useAsync(
    () => (isOwnerPreview ? Promise.resolve(previewJournals.length > 0 ? previewJournals : buildPreviewJournals()) : services.newsroomFinance.listJournals()),
    [refreshKey, isOwnerPreview]
  );

  const overviewData = isOwnerPreview ? previewOverview : liveOverview.data;
  const invoicesData = isOwnerPreview
    ? localInvoices.filter((inv) => invoiceStatusFilter === "all" || inv.effectiveStatus === invoiceStatusFilter || inv.status === invoiceStatusFilter)
    : (liveInvoices.data ?? []);
  const agingData = isOwnerPreview ? previewAging : liveAging.data;
  const paymentsData = isOwnerPreview ? localPayments : (livePayments.data ?? []);
  const rawExpenses = isOwnerPreview ? localExpenses : (liveExpenses.data ?? []);
  const expensesData = useMemo(() => {
    if (expenseScope === "my") {
      const staffName = currentStaffName.trim().toLowerCase();
      return rawExpenses.filter((e) => {
        const subName = (e.submittedByName ?? "").trim().toLowerCase();
        return subName === staffName || subName.includes(staffName.split(" ")[0] ?? "");
      });
    }
    return rawExpenses;
  }, [rawExpenses, expenseScope, currentStaffName]);
  const statementsData = isOwnerPreview ? previewStatements : liveStatements.data;
  const customersData = isOwnerPreview ? localCustomers : (liveCustomers.data ?? []);
  const ordersData = isOwnerPreview ? localOrders : (liveOrders.data ?? []);
  const trialBalanceData = isOwnerPreview ? (previewTrialBalance ?? buildPreviewTrialBalance()) : liveTrialBalance.data;
  const pnlData = isOwnerPreview ? (previewProfitAndLoss ?? buildPreviewProfitAndLoss()) : liveProfitAndLoss.data;
  const balanceSheetData = isOwnerPreview ? (previewBalanceSheet ?? buildPreviewBalanceSheet()) : liveBalanceSheet.data;
  const journalsData = isOwnerPreview ? localJournals : (liveJournals.data ?? []);

  // Form States for Modals
  const [newInvCustomerId, setNewInvCustomerId] = useState<string>("");
  const [newInvOrderId, setNewInvOrderId] = useState<string | null>(null);
  const [newInvDesc, setNewInvDesc] = useState<string>("Direct Advertising placement");
  const [newInvPlacement, setNewInvPlacement] = useState<string>("masthead");
  const [newInvQty, setNewInvQty] = useState<string>("1");
  const [newInvUnitPrice, setNewInvUnitPrice] = useState<string>("500.00");
  const [newInvTaxRate, setNewInvTaxRate] = useState<string>("0.15");
  const [newInvCurrency, setNewInvCurrency] = useState<string>("USD");

  // Customer Form State
  const [newCustLegalName, setNewCustLegalName] = useState<string>("");
  const [newCustTradingName, setNewCustTradingName] = useState<string>("");
  const [newCustEmail, setNewCustEmail] = useState<string>("");
  const [newCustPhone, setNewCustPhone] = useState<string>("");
  const [newCustAddress, setNewCustAddress] = useState<string>("");
  const [newCustTaxId, setNewCustTaxId] = useState<string>("");
  const [newCustCurrency, setNewCustCurrency] = useState<string>("USD");
  const [newCustTerms, setNewCustTerms] = useState<string>("30");

  // Order Form State
  const [newOrderCustomerId, setNewOrderCustomerId] = useState<string>("");
  const [newOrderCampaignId, setNewOrderCampaignId] = useState<string>("");
  const [newOrderStartDate, setNewOrderStartDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [newOrderEndDate, setNewOrderEndDate] = useState<string>("");
  const [newOrderCurrency, setNewOrderCurrency] = useState<string>("USD");
  const [newOrderSubtotal, setNewOrderSubtotal] = useState<string>("500.00");
  const [newOrderTax, setNewOrderTax] = useState<string>("75.00");
  const [newOrderDiscount, setNewOrderDiscount] = useState<string>("0");
  const [newOrderNotes, setNewOrderNotes] = useState<string>("");

  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("bank_transfer");
  const [paymentRef, setPaymentRef] = useState<string>("");

  const [expVendor, setExpVendor] = useState<string>("");
  const [expCategory, setExpCategory] = useState<string>("travel");
  const [expDesc, setExpDesc] = useState<string>("");
  const [expAmount, setExpAmount] = useState<string>("");
  const [expCurrency, setExpCurrency] = useState<string>("USD");
  const [expDept, setExpDept] = useState<string>("Editorial");
  const [expDate, setExpDate] = useState<string>("2026-10-24");
  const [expReceiptEvidence, setExpReceiptEvidence] = useState<string>("");

  // Credit Note Modal State
  const [isCreditNoteModalOpen, setIsCreditNoteModalOpen] = useState(false);
  const [creditNoteInvoice, setCreditNoteInvoice] = useState<NewsroomInvoiceItem | null>(null);
  const [creditNoteAmount, setCreditNoteAmount] = useState<string>("");
  const [creditNoteReason, setCreditNoteReason] = useState<string>("Adjustment / Disputed billing concession");

  // Printable Invoice Modal State
  const [isPrintInvoiceModalOpen, setIsPrintInvoiceModalOpen] = useState(false);
  const [printInvoiceItem, setPrintInvoiceItem] = useState<NewsroomInvoiceItem | null>(null);

  // Printable Receipt Modal State
  const [isPrintReceiptModalOpen, setIsPrintReceiptModalOpen] = useState(false);
  const [printPaymentItem, setPrintPaymentItem] = useState<NewsroomPaymentItem | null>(null);

  // Customer Statement Modal State
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [statementCustomer, setStatementCustomer] = useState<NewsroomCustomer | null>(null);
  const [customerStatementData, setCustomerStatementData] = useState<NewsroomCustomerStatement | null>(null);
  const [statementLoading, setStatementLoading] = useState(false);

  // Reverse Journal Modal State
  const [isReverseJournalModalOpen, setIsReverseJournalModalOpen] = useState(false);
  const [reverseJournalEntry, setReverseJournalEntry] = useState<NewsroomJournalEntry | null>(null);
  const [reverseReason, setReverseReason] = useState<string>("Correction of posting error");

  function notify(msg: string) {
    setActionMessage(msg);
    setActionError(null);
    setTimeout(() => setActionMessage(null), 4000);
  }

  function notifyError(err: unknown) {
    setActionError(err instanceof Error ? err.message : String(err));
    setTimeout(() => setActionError(null), 6000);
  }

  // Invoice Actions
  async function handleApproveInvoice(invId: string) {
    if (isOwnerPreview) {
      setLocalInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invId ? { ...inv, status: "approved", effectiveStatus: "approved" } : inv
        )
      );
      notify("Preview state only: Invoice approved in local preview memory (writes disabled).");
      return;
    }
    try {
      await services.newsroomFinance.approveInvoice(invId);
      notify("Invoice approved successfully.");
      setRefreshKey((k) => k + 1);
    } catch (e) {
      notifyError(e);
    }
  }

  async function handleIssueInvoice(invId: string) {
    if (isOwnerPreview) {
      const today = new Date().toISOString().slice(0, 10);
      setLocalInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invId
            ? { ...inv, status: "issued", effectiveStatus: "issued", issueDate: today }
            : inv
        )
      );
      notify("Preview state only: Invoice issued in local preview memory (writes disabled).");
      return;
    }
    try {
      await services.newsroomFinance.issueInvoice(invId);
      notify("Invoice issued and payment terms set.");
      setRefreshKey((k) => k + 1);
    } catch (e) {
      notifyError(e);
    }
  }

  async function handleVoidInvoice(invId: string) {
    if (isOwnerPreview) {
      setLocalInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invId
            ? { ...inv, status: "void", effectiveStatus: "void", balanceDue: 0 }
            : inv
        )
      );
      notify("Preview state only: Invoice voided in local preview memory (writes disabled).");
      return;
    }
    try {
      await services.newsroomFinance.voidInvoice(invId, "Operational cancellation");
      notify("Invoice voided.");
      setRefreshKey((k) => k + 1);
    } catch (e) {
      notifyError(e);
    }
  }

  async function handleCreateInvoice() {
    const qty = Number(newInvQty);
    const price = Number(newInvUnitPrice);
    const taxRate = Number(newInvTaxRate);
    const validationError = validatePreviewInvoiceInput({
      customerId: newInvCustomerId,
      description: newInvDesc,
      currency: newInvCurrency,
      quantity: qty,
      unitPrice: price,
      taxRate
    });
    if (validationError) {
      notifyError(validationError);
      return;
    }
    if (isOwnerPreview) {
      const cust = customersData.find((c) => c.id === newInvCustomerId) ?? customersData[0];
      const subtotal = qty * price;
      const taxTotal = Number((subtotal * taxRate).toFixed(2));
      const total = Number((subtotal + taxTotal).toFixed(2));
      const today = new Date().toISOString().slice(0, 10);
      const createdInv: NewsroomInvoiceItem = {
        id: `inv-preview-${Date.now()}`,
        invoiceNumber: `INV-2026-000${localInvoices.length + 1}`,
        orderId: newInvOrderId ?? null,
        orderNumber: newInvOrderId ? `ORD-LINKED` : null,
        customerId: cust?.id ?? "cust-sample-1",
        customerName: cust?.name ?? "Health Corp Zimbabwe Ltd",
        currency: newInvCurrency || "USD",
        issueDate: today,
        dueDate: "2026-11-24",
        paymentTermsDays: 30,
        daysOverdue: 0,
        paymentCount: 0,
        status: "draft",
        effectiveStatus: "draft",
        subtotal,
        taxTotal,
        discountTotal: 0,
        total,
        amountPaid: 0,
        balanceDue: total,
        notes: `${newInvDesc} (${newInvPlacement})`,
        createdBy: currentStaffName,
        approvedBy: null,
        approvedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setLocalInvoices((prev) => [createdInv, ...prev]);
      notify("Preview state only: Draft invoice created in local preview memory (writes disabled).");
      setIsInvoiceModalOpen(false);
      setNewInvOrderId(null);
      return;
    }
    try {
      await services.newsroomFinance.createInvoice({
        customerId: newInvCustomerId,
        orderId: newInvOrderId ?? undefined,
        currency: newInvCurrency,
        lines: [
          {
            description: newInvDesc,
            category: "advertising",
            placement: newInvPlacement,
            quantity: qty,
            unitPrice: price,
            taxRate: taxRate,
            discount: 0
          }
        ]
      });
      notify("Invoice created successfully.");
      setIsInvoiceModalOpen(false);
      setNewInvOrderId(null);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      notifyError(e);
    }
  }

  async function handleSaveCustomer() {
    const legalName = newCustLegalName.trim() || newCustTradingName.trim();
    if (!legalName) {
      notifyError("Legal or Trading name is required.");
      return;
    }
    if (!newCustEmail.trim()) {
      notifyError("Billing email is required.");
      return;
    }
    if (isOwnerPreview) {
      const createdCust: NewsroomCustomer = {
        id: `cust-prev-${Date.now()}`,
        advertiserId: null,
        name: newCustTradingName.trim() || legalName,
        legalName: legalName,
        billingEmail: newCustEmail.trim(),
        billingPhone: newCustPhone.trim() || null,
        billingAddress: newCustAddress.trim() || null,
        taxNumber: newCustTaxId.trim() || null,
        currency: newCustCurrency,
        paymentTermsDays: Number(newCustTerms) || 30,
        status: "active",
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setLocalCustomers((prev) => [createdCust, ...prev]);
      notify(`Preview state: Customer ${createdCust.name} created in local preview memory.`);
      setIsCustomerModalOpen(false);
      return;
    }
    try {
      const created = await services.newsroomFinance.upsertCustomer({
        name: newCustTradingName.trim() || legalName,
        legalName: legalName,
        billingEmail: newCustEmail.trim(),
        billingPhone: newCustPhone.trim() || undefined,
        billingAddress: newCustAddress.trim() || undefined,
        taxNumber: newCustTaxId.trim() || undefined,
        currency: newCustCurrency,
        paymentTermsDays: Number(newCustTerms) || 30
      });
      notify(`Customer ${created.legalName ?? created.name} created successfully.`);
      setIsCustomerModalOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      notifyError(e);
    }
  }

  async function handleSaveOrder() {
    const custId = newOrderCustomerId.trim() || (customersData[0]?.id ?? "");
    if (!custId) {
      notifyError("Select a customer for this order.");
      return;
    }
    const subtotal = Number(newOrderSubtotal);
    if (!Number.isFinite(subtotal) || subtotal <= 0) {
      notifyError("Subtotal must be greater than zero.");
      return;
    }
    const tax = Number(newOrderTax) || 0;
    const discount = Number(newOrderDiscount) || 0;
    const total = subtotal + tax - discount;

    if (isOwnerPreview) {
      const cust = customersData.find((c) => c.id === custId) ?? customersData[0];
      const createdOrd: NewsroomCommercialOrder = {
        id: `ord-prev-${Date.now()}`,
        orderNumber: `ORD-2026-000${localOrders.length + 1}`,
        customerId: custId,
        customerName: cust?.name ?? "Commercial Client",
        campaignId: newOrderCampaignId.trim() || null,
        campaignName: newOrderCampaignId.trim() ? "Campaign Booking" : null,
        status: "draft",
        billingStatus: "unbilled",
        currency: newOrderCurrency,
        subtotal,
        taxAmount: tax,
        discountAmount: discount,
        total,
        startDate: newOrderStartDate.trim() || new Date().toISOString().slice(0, 10),
        endDate: newOrderEndDate.trim() || null,
        notes: newOrderNotes.trim() || null,
        submittedBy: currentStaffName,
        approvedBy: null,
        approvedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setLocalOrders((prev) => [createdOrd, ...prev]);
      notify(`Preview state: Order ${createdOrd.orderNumber} created in local preview memory.`);
      setIsOrderModalOpen(false);
      return;
    }
    try {
      const created = await services.newsroomFinance.createOrder({
        customerId: custId,
        campaignId: newOrderCampaignId.trim() || undefined,
        startDate: newOrderStartDate.trim() || undefined,
        endDate: newOrderEndDate.trim() || undefined,
        currency: newOrderCurrency,
        subtotal,
        taxAmount: tax,
        discountAmount: discount,
        notes: newOrderNotes.trim() || undefined
      });
      notify(`Order ${created.orderNumber} created successfully.`);
      setIsOrderModalOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      notifyError(e);
    }
  }

  async function handleApproveOrder(orderId: string) {
    if (isOwnerPreview) {
      setLocalOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: "approved" } : o)));
      notify("Preview state: Order approved.");
      return;
    }
    try {
      await services.newsroomFinance.approveOrder(orderId);
      notify("Commercial order approved successfully.");
      setRefreshKey((k) => k + 1);
    } catch (e) {
      notifyError(e);
    }
  }

  async function handleRecordPayment() {
    if (!selectedInvoice) return;
    if (isOwnerPreview) {
      const amt = Number(paymentAmount);
      if (!Number.isFinite(amt) || amt <= 0) {
        notifyError("Payment amount must be greater than zero.");
        return;
      }
      if (amt > selectedInvoice.balanceDue) {
        notifyError("Payment cannot exceed the outstanding balance.");
        return;
      }
      const today = new Date().toISOString().slice(0, 10);
      const newPay: NewsroomPaymentItem = {
        id: `pay-preview-${Date.now()}`,
        paymentNumber: `PAY-2026-000${localPayments.length + 1}`,
        invoiceId: selectedInvoice.id,
        invoiceNumber: selectedInvoice.invoiceNumber,
        customerId: selectedInvoice.customerId,
        customerName: selectedInvoice.customerName,
        amount: amt,
        currency: selectedInvoice.currency,
        paymentMethod: paymentMethod || "bank_transfer",
        reference: paymentRef || `PREV-REF-${Date.now().toString().slice(-4)}`,
        notes: `Recorded against ${selectedInvoice.invoiceNumber}`,
        paymentDate: today,
        recordedBy: "preview-persona",
        recordedByName: currentStaffName,
        createdAt: new Date().toISOString()
      };
      setLocalPayments((prev) => [newPay, ...prev]);
      setLocalInvoices((prev) =>
        prev.map((inv) => {
          if (inv.id !== selectedInvoice.id) return inv;
          const nextPaid = Number((inv.amountPaid + amt).toFixed(2));
          const nextDue = Math.max(0, Number((inv.total - nextPaid).toFixed(2)));
          const nextStatus = nextDue === 0 ? "paid" : "partially_paid";
          return {
            ...inv,
            amountPaid: nextPaid,
            balanceDue: nextDue,
            status: nextStatus,
            effectiveStatus: nextStatus
          };
        })
      );
      notify("Preview state only: Payment recorded in local preview memory (writes disabled).");
      setIsPaymentModalOpen(false);
      setSelectedInvoice(null);
      setPaymentAmount("");
      return;
    }
    try {
      const amt = parseFloat(paymentAmount);
      if (!amt || amt <= 0) throw new Error("Enter a valid payment amount");
      if (amt > selectedInvoice.balanceDue) {
        throw new Error("Payment cannot exceed the outstanding balance.");
      }
      const idemKey = `pay-${selectedInvoice.id}-${Date.now()}`;
      await services.newsroomFinance.recordPayment({
        invoiceId: selectedInvoice.id,
        amount: amt,
        currency: selectedInvoice.currency,
        paymentMethod: paymentMethod,
        reference: paymentRef || null,
        idempotencyKey: idemKey
      });
      notify("Payment recorded. Invoice balance updated.");
      setIsPaymentModalOpen(false);
      setSelectedInvoice(null);
      setPaymentAmount("");
      setRefreshKey((k) => k + 1);
    } catch (e) {
      notifyError(e);
    }
  }

  async function handleCreateExpense() {
    if (isOwnerPreview) {
      const amt = parseFloat(expAmount) || 85.0;
      const createdDate = expDate.trim() || new Date().toISOString().split("T")[0]!;
      const createdClaim: NewsroomExpenseItem = {
        id: `prev-exp-${Date.now()}`,
        expenseNumber: `EXP-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        expenseDate: createdDate,
        vendorName: expVendor.trim() || "Field Reporting Vendor",
        category: expCategory || "travel",
        description: expDesc.trim() || "Newsroom operational expense",
        department: expDept || "Editorial",
        storyId: null,
        amount: amt,
        currency: expCurrency || "USD",
        taxAmount: 0.0,
        receiptReference: expReceiptEvidence.trim() || `RCPT-${Math.floor(1000 + Math.random() * 9000)}`,
        receiptUrl: expReceiptEvidence.trim() ? `https://healthtimes.co.zw/receipts/${encodeURIComponent(expReceiptEvidence.trim())}` : null,
        status: "submitted",
        paymentStatus: "unpaid",
        paidAt: null,
        paymentReference: null,
        rejectionReason: null,
        submittedBy: "preview-persona-current",
        submittedByName: currentStaffName,
        approvedBy: null,
        approvedByName: null,
        approvedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setLocalExpenses((prev) => [createdClaim, ...prev]);
      notify("Preview state only: Expense claim created in local Preview memory (status: SUBMITTED). Not persisted to live database.");
      setIsExpenseModalOpen(false);
      setExpVendor("");
      setExpDesc("");
      setExpAmount("");
      setExpReceiptEvidence("");
      return;
    }
    try {
      const amt = parseFloat(expAmount);
      if (!amt || amt <= 0) throw new Error("Enter a valid expense amount");
      if (!expVendor) throw new Error("Vendor name is required");
      if (!expDesc) throw new Error("Expense description is required");

      await services.newsroomFinance.createExpense({
        expenseDate: expDate.trim() || new Date().toISOString().slice(0, 10),
        vendorName: expVendor,
        category: expCategory,
        description: expDesc,
        department: expDept,
        amount: amt,
        currency: expCurrency,
        receiptReference: expReceiptEvidence.trim() || null,
        submitImmediately: true
      });
      notify("Expense submitted for review.");
      setIsExpenseModalOpen(false);
      setExpVendor("");
      setExpDesc("");
      setExpAmount("");
      setRefreshKey((k) => k + 1);
    } catch (e) {
      notifyError(e);
    }
  }

  async function handleApproveExpense(expId: string) {
    if (isOwnerPreview) {
      setLocalExpenses((prev) =>
        prev.map((e) =>
          e.id === expId
            ? { ...e, status: "approved", approvedByName: "Dr. Tawanda Chideme", approvedAt: new Date().toISOString() }
            : e
        )
      );
      notify("Owner Preview: Expense approval simulated in local preview memory. Strict separation of duties applies in production.");
      return;
    }
    try {
      await services.newsroomFinance.approveExpense(expId);
      notify("Expense claim approved.");
      setRefreshKey((k) => k + 1);
    } catch (e) {
      notifyError(e);
    }
  }

  async function handlePayExpense(expId: string) {
    if (isOwnerPreview) {
      setLocalExpenses((prev) =>
        prev.map((e) =>
          e.id === expId
            ? {
                ...e,
                paymentStatus: "paid",
                paidAt: new Date().toISOString(),
                paymentReference: `PAY-EXP-PREV-${Date.now().toString().slice(-4)}`
              }
            : e
        )
      );
      notify("Preview state only: Expense marked paid in local preview memory (writes disabled).");
      return;
    }
    try {
      await services.newsroomFinance.payExpense(expId, `PAY-EXP-${Date.now().toString().slice(-6)}`);
      notify("Expense marked as paid.");
      setRefreshKey((k) => k + 1);
    } catch (e) {
      notifyError(e);
    }
  }

  async function handleCreateCreditNote() {
    if (!creditNoteInvoice) return;
    const amt = parseFloat(creditNoteAmount);
    if (isNaN(amt) || amt <= 0) {
      notifyError(new Error("Credit amount must be greater than zero."));
      return;
    }
    if (amt > creditNoteInvoice.total) {
      notifyError(new Error(`Credit amount (${amt}) cannot exceed invoice total (${creditNoteInvoice.total}).`));
      return;
    }
    if (isOwnerPreview) {
      setLocalInvoices((prev) =>
        prev.map((inv) => {
          if (inv.id !== creditNoteInvoice.id) return inv;
          const nextDiscount = Number((inv.discountTotal + amt).toFixed(2));
          const nextDue = Math.max(0, Number((inv.balanceDue - amt).toFixed(2)));
          return {
            ...inv,
            discountTotal: nextDiscount,
            balanceDue: nextDue,
            effectiveStatus: nextDue === 0 ? "paid" : inv.effectiveStatus
          };
        })
      );
      notify(`Preview state only: Credit Note for ${creditNoteInvoice.currency} ${amt.toFixed(2)} simulated in local preview memory.`);
      setIsCreditNoteModalOpen(false);
      return;
    }
    try {
      await services.newsroomFinance.createCreditNote(creditNoteInvoice.id, amt, creditNoteReason);
      notify(`Credit Note issued successfully against ${creditNoteInvoice.invoiceNumber}. GL revenue adjustment journal posted.`);
      setIsCreditNoteModalOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      notifyError(e);
    }
  }

  async function handleReverseJournal() {
    if (!reverseJournalEntry) return;
    if (isOwnerPreview) {
      setLocalJournals((prev) =>
        prev.map((j) => (j.id === reverseJournalEntry.id ? { ...j, status: "reversed" } : j))
      );
      notify(`Preview state only: Journal entry ${reverseJournalEntry.entryNumber} marked reversed in local preview memory.`);
      setIsReverseJournalModalOpen(false);
      return;
    }
    try {
      await services.newsroomFinance.reverseJournalEntry(reverseJournalEntry.id, reverseReason);
      notify(`Journal entry ${reverseJournalEntry.entryNumber} reversed. Offsetting reversal entry posted.`);
      setIsReverseJournalModalOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      notifyError(e);
    }
  }

  async function handleOpenCustomerStatement(cust: NewsroomCustomer) {
    setStatementCustomer(cust);
    setIsStatementModalOpen(true);
    setStatementLoading(true);
    try {
      if (isOwnerPreview) {
        setCustomerStatementData(buildPreviewCustomerStatement(cust.id));
      } else {
        const stmt = await services.newsroomFinance.getCustomerStatement(cust.id);
        setCustomerStatementData(stmt);
      }
    } catch (e) {
      notifyError(e);
    } finally {
      setStatementLoading(false);
    }
  }

  function handlePrintDocument() {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.print();
    } else {
      notify("Document ready for printing.");
    }
  }

  // Active currency overview figures
  const activeCurrencyOverview = useMemo(() => {
    if (!overviewData?.byCurrency) return null;
    return (
      overviewData.byCurrency.find((c) => c.currency === currencyFilter) ??
      overviewData.byCurrency[0] ??
      null
    );
  }, [overviewData, currencyFilter]);

  return (
    <View style={styles.container}>
      {isOwnerPreview && (
        <View
          style={{
            backgroundColor: "#FFFBEB",
            borderBottomWidth: 1,
            borderBottomColor: "#FDE68A",
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.sm
          }}
          testID="finance-sample-data-banner"
        >
          <Text style={{ fontSize: 12, fontWeight: "700", color: "#92400E" }}>
            ℹ️ Sample Financial & General Ledger Figures (Owner Preview): Invoices, cash receipts, receivables aging, expenses, and GAAP ledger balances shown below are sample presentation records reconciled across tabs. Actions simulate in local Preview memory only and never record real accounting entries or charge customers.
          </Text>
        </View>
      )}
      {/* Action Notification Banners */}
      {actionMessage && (
        <View style={styles.bannerSuccess}>
          <Text style={styles.bannerSuccessText}>{actionMessage}</Text>
        </View>
      )}
      {actionError && (
        <View style={styles.bannerError}>
          <Text style={styles.bannerErrorText}>{actionError}</Text>
        </View>
      )}

      {/* KPI Top Strip */}
      <View style={styles.kpiStrip}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>INVOICED TOTAL</Text>
          <Text style={styles.kpiValue}>
            {currencyFilter} {(activeCurrencyOverview?.invoicedTotal ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </Text>
          <Text style={styles.kpiSub}>{activeCurrencyOverview?.openInvoicesCount ?? 0} open invoices</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>COLLECTED REVENUE</Text>
          <Text style={[styles.kpiValue, { color: colors.success }]}>
            {currencyFilter} {(activeCurrencyOverview?.revenueCollected ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </Text>
          <Text style={styles.kpiSub}>Cash receipts recorded</Text>
        </View>

        <View style={[styles.kpiCard, (activeCurrencyOverview?.receivablesOverdue ?? 0) > 0 && styles.kpiCardAlert]}>
          <Text style={styles.kpiLabel}>OUTSTANDING AR</Text>
          <Text style={[styles.kpiValue, (activeCurrencyOverview?.receivablesOverdue ?? 0) > 0 ? { color: colors.live } : {}]}>
            {currencyFilter} {(activeCurrencyOverview?.receivablesOutstanding ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </Text>
          <Text style={styles.kpiSub}>
            {(activeCurrencyOverview?.receivablesOverdue ?? 0) > 0
              ? `${currencyFilter} ${activeCurrencyOverview?.receivablesOverdue?.toFixed(2)} overdue`
              : "All current"}
          </Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>APPROVED EXPENSES</Text>
          <Text style={styles.kpiValue}>
            {currencyFilter} {(activeCurrencyOverview?.expensesApproved ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </Text>
          <Text style={styles.kpiSub}>Paid: {currencyFilter} {(activeCurrencyOverview?.expensesPaid ?? 0).toFixed(2)}</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>OPERATING CASH NET</Text>
          <Text
            style={[
              styles.kpiValue,
              { color: (activeCurrencyOverview?.operatingCashNet ?? 0) >= 0 ? colors.ink : colors.live }
            ]}
          >
            {currencyFilter} {(activeCurrencyOverview?.operatingCashNet ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </Text>
          <Text style={styles.kpiSub}>Collected minus paid expenses</Text>
        </View>
      </View>

      {/* Domain Navigation Tabs */}
      <View style={styles.tabsRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
          <Pressable
            style={[styles.tabBtn, activeTab === "overview" && styles.tabBtnActive]}
            onPress={() => setActiveTab("overview")}
          >
            <Text style={[styles.tabBtnText, activeTab === "overview" && styles.tabBtnTextActive]}>Overview</Text>
          </Pressable>

          <Pressable
            style={[styles.tabBtn, activeTab === "invoices" && styles.tabBtnActive]}
            onPress={() => setActiveTab("invoices")}
          >
            <Text style={[styles.tabBtnText, activeTab === "invoices" && styles.tabBtnTextActive]}>
              Invoices & Billing ({invoicesData.length})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabBtn, activeTab === "aging" && styles.tabBtnActive]}
            onPress={() => setActiveTab("aging")}
          >
            <Text style={[styles.tabBtnText, activeTab === "aging" && styles.tabBtnTextActive]}>AR Aging</Text>
          </Pressable>

          <Pressable
            style={[styles.tabBtn, activeTab === "payments" && styles.tabBtnActive]}
            onPress={() => setActiveTab("payments")}
          >
            <Text style={[styles.tabBtnText, activeTab === "payments" && styles.tabBtnTextActive]}>
              Payments Ledger ({paymentsData.length})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabBtn, activeTab === "expenses" && styles.tabBtnActive]}
            onPress={() => setActiveTab("expenses")}
          >
            <Text style={[styles.tabBtnText, activeTab === "expenses" && styles.tabBtnTextActive]}>
              Expenses ({expensesData.length})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabBtn, activeTab === "trial-balance" && styles.tabBtnActive]}
            onPress={() => setActiveTab("trial-balance")}
          >
            <Text style={[styles.tabBtnText, activeTab === "trial-balance" && styles.tabBtnTextActive]}>
              Trial Balance
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabBtn, activeTab === "pnl" && styles.tabBtnActive]}
            onPress={() => setActiveTab("pnl")}
          >
            <Text style={[styles.tabBtnText, activeTab === "pnl" && styles.tabBtnTextActive]}>
              Profit & Loss
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabBtn, activeTab === "balance-sheet" && styles.tabBtnActive]}
            onPress={() => setActiveTab("balance-sheet")}
          >
            <Text style={[styles.tabBtnText, activeTab === "balance-sheet" && styles.tabBtnTextActive]}>
              Balance Sheet
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabBtn, activeTab === "journals" && styles.tabBtnActive]}
            onPress={() => setActiveTab("journals")}
          >
            <Text style={[styles.tabBtnText, activeTab === "journals" && styles.tabBtnTextActive]}>
              GL Journals ({journalsData.length})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabBtn, activeTab === "statements" && styles.tabBtnActive]}
            onPress={() => setActiveTab("statements")}
          >
            <Text style={[styles.tabBtnText, activeTab === "statements" && styles.tabBtnTextActive]}>Statements</Text>
          </Pressable>

          <Pressable
            style={[styles.tabBtn, activeTab === "orders" && styles.tabBtnActive]}
            onPress={() => setActiveTab("orders")}
          >
            <Text style={[styles.tabBtnText, activeTab === "orders" && styles.tabBtnTextActive]}>
              Commercial Orders ({ordersData.length})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabBtn, activeTab === "customers" && styles.tabBtnActive]}
            onPress={() => setActiveTab("customers")}
          >
            <Text style={[styles.tabBtnText, activeTab === "customers" && styles.tabBtnTextActive]}>
              Billing Customers ({customersData.length})
            </Text>
          </Pressable>
        </ScrollView>
      </View>

      {/* TAB CONTENT */}

      {/* 1. OVERVIEW TAB */}
      {activeTab === "overview" && (
        <View style={styles.tabContent}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Financial Operations Summary</Text>
            <View style={styles.currencyToggle}>
              {["USD", "ZWG", "ZAR"].map((curr) => (
                <Pressable
                  key={curr}
                  style={[styles.currBtn, currencyFilter === curr && styles.currBtnActive]}
                  onPress={() => setCurrencyFilter(curr)}
                >
                  <Text style={[styles.currBtnText, currencyFilter === curr && styles.currBtnTextActive]}>
                    {curr}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryCardTitle}>Invoicing Activity</Text>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Total Invoiced (All Time)</Text>
                <Text style={styles.metricValue}>
                  {currencyFilter} {(activeCurrencyOverview?.invoicedTotal ?? 0).toFixed(2)}
                </Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Active Open Invoices</Text>
                <Text style={styles.metricValue}>{overviewData?.counts.openInvoices ?? 0}</Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Overdue Invoices</Text>
                <Text style={[styles.metricValue, (overviewData?.counts.overdueInvoices ?? 0) > 0 ? { color: colors.live } : {}]}>
                  {overviewData?.counts.overdueInvoices ?? 0}
                </Text>
              </View>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryCardTitle}>Receivables Health</Text>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Current Receivables</Text>
                <Text style={styles.metricValue}>
                  {currencyFilter} {((activeCurrencyOverview?.receivablesOutstanding ?? 0) - (activeCurrencyOverview?.receivablesOverdue ?? 0)).toFixed(2)}
                </Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Overdue Receivables</Text>
                <Text style={[styles.metricValue, { color: colors.live }]}>
                  {currencyFilter} {(activeCurrencyOverview?.receivablesOverdue ?? 0).toFixed(2)}
                </Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Active Corporate Customers</Text>
                <Text style={styles.metricValue}>{overviewData?.counts.activeCustomers ?? 0}</Text>
              </View>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryCardTitle}>Newsroom Expense Approvals</Text>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Pending Review</Text>
                <Text style={styles.metricValue}>{overviewData?.counts.pendingExpenses ?? 0} claims</Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Approved (Awaiting Payout)</Text>
                <Text style={styles.metricValue}>{overviewData?.counts.approvedUnpaidExpenses ?? 0} claims</Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Pending Commercial Orders</Text>
                <Text style={styles.metricValue}>{overviewData?.counts.pendingOrders ?? 0}</Text>
              </View>
            </View>
          </View>

          {/* Quick Actions Bar */}
          <View style={styles.quickActionsBar}>
            <Pressable
              style={styles.actionBtnPrimary}
              onPress={() => setIsInvoiceModalOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Create a new invoice"
            >
              <Text style={styles.actionBtnPrimaryText}>+ Create Invoice</Text>
            </Pressable>
            <Pressable
              style={styles.actionBtnSecondary}
              onPress={() => setIsExpenseModalOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Submit a new expense claim"
            >
              <Text style={styles.actionBtnSecondaryText}>+ Submit Expense Claim</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* 2. INVOICES TAB */}
      {activeTab === "invoices" && (
        <View style={styles.tabContent}>
          <View style={styles.toolbar}>
            <View style={styles.filterGroup}>
              {["all", "draft", "approved", "issued", "overdue", "partially_paid", "paid"].map((st) => (
                <Pressable
                  key={st}
                  style={[styles.filterChip, invoiceStatusFilter === st && styles.filterChipActive]}
                  onPress={() => setInvoiceStatusFilter(st)}
                >
                  <Text style={[styles.filterChipText, invoiceStatusFilter === st && styles.filterChipTextActive]}>
                    {st.replace("_", " ").toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={styles.actionBtnPrimary}
              onPress={() => setIsInvoiceModalOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Create a new invoice"
            >
              <Text style={styles.actionBtnPrimaryText}>+ New Invoice</Text>
            </Pressable>
          </View>

          {liveInvoices.loading && <ActivityIndicator size="small" color={colors.blue} />}

          {invoicesData.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No Invoices Found</Text>
              <Text style={styles.emptySub}>No invoices match the selected filter. Create one to begin billing.</Text>
            </View>
          ) : (
            <ScrollView horizontal style={styles.tableScroll}>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.th, { width: 130 }]}>INVOICE #</Text>
                  <Text style={[styles.th, { width: 180 }]}>CUSTOMER</Text>
                  <Text style={[styles.th, { width: 100 }]}>DATE</Text>
                  <Text style={[styles.th, { width: 100 }]}>DUE DATE</Text>
                  <Text style={[styles.th, { width: 100, textAlign: "right" }]}>TOTAL</Text>
                  <Text style={[styles.th, { width: 110, textAlign: "right" }]}>BALANCE DUE</Text>
                  <Text style={[styles.th, { width: 120, textAlign: "center" }]}>STATUS</Text>
                  <Text style={[styles.th, { width: 320 }]}>ACTIONS</Text>
                </View>

                {invoicesData.map((inv) => (
                  <View key={inv.id} style={styles.tableRow}>
                    <Text style={[styles.td, styles.codeText, { width: 130 }]}>{inv.invoiceNumber}</Text>
                    <Text style={[styles.td, { width: 180 }]} numberOfLines={1}>
                      {inv.customerName}
                    </Text>
                    <Text style={[styles.td, { width: 100 }]}>{inv.issueDate ?? inv.createdAt.slice(0, 10)}</Text>
                    <Text style={[styles.td, { width: 100 }]}>{inv.dueDate ?? "—"}</Text>
                    <Text style={[styles.td, { width: 100, textAlign: "right", fontWeight: "700" }]}>
                      {inv.currency} {inv.total.toFixed(2)}
                    </Text>
                    <Text
                      style={[
                        styles.td,
                        { width: 110, textAlign: "right", fontWeight: "700" },
                        inv.balanceDue > 0 ? { color: colors.live } : { color: colors.success }
                      ]}
                    >
                      {inv.currency} {inv.balanceDue.toFixed(2)}
                    </Text>
                    <View style={[styles.tdCell, { width: 120, alignItems: "center" }]}>
                      <View style={[styles.badge, getStatusBadgeStyle(inv.effectiveStatus)]}>
                        <Text style={styles.badgeText}>{inv.effectiveStatus.toUpperCase()}</Text>
                      </View>
                    </View>
                    <View style={[styles.tdCell, styles.rowActions, { width: 320 }]}>
                      <Pressable
                        style={styles.miniBtn}
                        onPress={() => setInspectedInvoice(inv)}
                        accessibilityRole="button"
                        accessibilityLabel={`View details for invoice ${inv.invoiceNumber}`}
                      >
                        <Text style={styles.miniBtnText}>Details</Text>
                      </Pressable>
                      <Pressable
                        style={styles.miniBtn}
                        onPress={() => {
                          setPrintInvoiceItem(inv);
                          setIsPrintInvoiceModalOpen(true);
                        }}
                      >
                        <Text style={styles.miniBtnText}>Print</Text>
                      </Pressable>
                      {inv.status === "draft" && (
                        <Pressable style={styles.miniBtn} onPress={() => handleApproveInvoice(inv.id)}>
                          <Text style={styles.miniBtnText}>Approve</Text>
                        </Pressable>
                      )}
                      {inv.status === "approved" && (
                        <Pressable style={styles.miniBtnPrimary} onPress={() => handleIssueInvoice(inv.id)}>
                          <Text style={styles.miniBtnPrimaryText}>Issue</Text>
                        </Pressable>
                      )}
                      {(inv.status === "issued" || inv.status === "partially_paid" || inv.effectiveStatus === "overdue") && (
                        <Pressable
                          style={styles.miniBtnSuccess}
                          onPress={() => {
                            setSelectedInvoice(inv);
                            setPaymentAmount(inv.balanceDue.toString());
                            setIsPaymentModalOpen(true);
                          }}
                        >
                          <Text style={styles.miniBtnSuccessText}>Pay</Text>
                        </Pressable>
                      )}
                      {(inv.status === "issued" || inv.status === "partially_paid" || inv.status === "paid") && (
                        <Pressable
                          style={styles.miniBtn}
                          onPress={() => {
                            setCreditNoteInvoice(inv);
                            setCreditNoteAmount(inv.balanceDue > 0 ? inv.balanceDue.toString() : inv.total.toString());
                            setIsCreditNoteModalOpen(true);
                          }}
                        >
                          <Text style={styles.miniBtnText}>Credit</Text>
                        </Pressable>
                      )}
                      {inv.amountPaid === 0 && inv.status !== "void" && (
                        <Pressable style={styles.miniBtnDanger} onPress={() => handleVoidInvoice(inv.id)}>
                          <Text style={styles.miniBtnDangerText}>Void</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
          {inspectedInvoice && (() => {
            const payOptions = getAdvertiserInvoicePaymentOptions(inspectedInvoice);
            return (
              <View style={styles.detailSummaryCard} testID="finance-invoice-detail">
                <View style={styles.toolbar}>
                  <View>
                    <Text style={styles.sectionTitle}>{inspectedInvoice.invoiceNumber}</Text>
                    <Text style={styles.sectionSub}>{inspectedInvoice.customerName} · {inspectedInvoice.orderNumber ?? "No linked order"}</Text>
                  </View>
                  <Pressable onPress={() => setInspectedInvoice(null)} accessibilityRole="button" accessibilityLabel="Close invoice details">
                    <Text style={styles.miniBtnText}>Close</Text>
                  </Pressable>
                </View>
                <Text style={styles.sectionSub}>{inspectedInvoice.notes ?? "No invoice description"}</Text>
                <Text style={styles.detailSummaryText}>Subtotal: {inspectedInvoice.currency} {inspectedInvoice.subtotal.toFixed(2)} · Tax: {inspectedInvoice.currency} {inspectedInvoice.taxTotal.toFixed(2)} · Discount: {inspectedInvoice.currency} {inspectedInvoice.discountTotal.toFixed(2)}</Text>
                <Text style={styles.detailSummaryText}>Total: {inspectedInvoice.currency} {inspectedInvoice.total.toFixed(2)} · Paid: {inspectedInvoice.currency} {inspectedInvoice.amountPaid.toFixed(2)} · Balance Due: {inspectedInvoice.currency} {inspectedInvoice.balanceDue.toFixed(2)}</Text>
                {payOptions.eligibleForPayment && (
                  <View style={styles.rowActions} testID="advertiser-invoice-payment-options">
                    <Pressable
                      style={[styles.miniBtn, !payOptions.payOnline.available && { opacity: 0.65 }]}
                      disabled={!payOptions.payOnline.available}
                      accessibilityRole="button"
                      accessibilityLabel={`Pay Online: ${payOptions.payOnline.statusText}`}
                    >
                      <Text style={styles.miniBtnText}>
                        Pay Online ({payOptions.payOnline.statusText})
                      </Text>
                    </Pressable>
                    <Pressable
                      style={styles.miniBtnSuccess}
                      onPress={() => {
                        setSelectedInvoice(inspectedInvoice);
                        setPaymentMethod("bank_transfer");
                        setPaymentAmount(inspectedInvoice.balanceDue.toString());
                        setIsPaymentModalOpen(true);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Bank Transfer"
                    >
                      <Text style={styles.miniBtnSuccessText}>Bank Transfer</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })()}
        </View>
      )}

      {/* 3. AR AGING TAB */}
      {activeTab === "aging" && (
        <View style={styles.tabContent}>
          <Text style={styles.sectionTitle}>Accounts Receivable Aging Breakdown</Text>
          <Text style={styles.sectionSub}>
            Standard financial aging buckets: Current / Not Due, 1–30 Days, 31–60 Days, 61–90 Days, and 90+ Days past due.
          </Text>

          {agingData?.totals && agingData.totals.length > 0 && (
            <View style={styles.agingTotalsRow}>
              {agingData.totals.map((t) => (
                <View key={t.currency} style={styles.agingTotalCard}>
                  <Text style={styles.agingCurrencyTitle}>{t.currency} Receivables Summary</Text>
                  <View style={styles.agingBucketsRow}>
                    <View style={[styles.agingBucket, { backgroundColor: "#E6F4EA" }]}>
                      <Text style={styles.agingBucketLabel}>NOT DUE</Text>
                      <Text style={[styles.agingBucketVal, { color: "#137333" }]}>{t.currency} {t.notDue.toFixed(2)}</Text>
                    </View>
                    <View style={[styles.agingBucket, { backgroundColor: "#FEF7E0" }]}>
                      <Text style={styles.agingBucketLabel}>1–30 DAYS</Text>
                      <Text style={[styles.agingBucketVal, { color: "#B06000" }]}>{t.currency} {t.d1_30.toFixed(2)}</Text>
                    </View>
                    <View style={[styles.agingBucket, { backgroundColor: "#FCE8E6" }]}>
                      <Text style={styles.agingBucketLabel}>31–60 DAYS</Text>
                      <Text style={[styles.agingBucketVal, { color: "#C5221F" }]}>{t.currency} {t.d31_60.toFixed(2)}</Text>
                    </View>
                    <View style={[styles.agingBucket, { backgroundColor: "#FCE8E6" }]}>
                      <Text style={styles.agingBucketLabel}>61–90 DAYS</Text>
                      <Text style={[styles.agingBucketVal, { color: "#C5221F" }]}>{t.currency} {t.d61_90.toFixed(2)}</Text>
                    </View>
                    <View style={[styles.agingBucket, { backgroundColor: "#FAD2CF" }]}>
                      <Text style={styles.agingBucketLabel}>90+ DAYS</Text>
                      <Text style={[styles.agingBucketVal, { color: "#A50E0E" }]}>{t.currency} {t.d90Plus.toFixed(2)}</Text>
                    </View>
                  </View>
                  <Text style={styles.agingTotalFoot}>
                    Total Outstanding: {t.currency} {t.totalOutstanding.toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Per-Customer Balances</Text>
          {agingData?.customers && agingData.customers.length > 0 ? (
            <ScrollView horizontal style={styles.tableScroll}>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.th, { width: 220 }]}>CUSTOMER</Text>
                  <Text style={[styles.th, { width: 70 }]}>CURR</Text>
                  <Text style={[styles.th, { width: 100, textAlign: "right" }]}>NOT DUE</Text>
                  <Text style={[styles.th, { width: 100, textAlign: "right" }]}>1–30 D</Text>
                  <Text style={[styles.th, { width: 100, textAlign: "right" }]}>31–60 D</Text>
                  <Text style={[styles.th, { width: 100, textAlign: "right" }]}>61–90 D</Text>
                  <Text style={[styles.th, { width: 100, textAlign: "right" }]}>90+ D</Text>
                  <Text style={[styles.th, { width: 120, textAlign: "right" }]}>TOTAL DUE</Text>
                </View>
                {agingData.customers.map((c) => (
                  <View key={c.customerId + c.currency} style={styles.tableRow}>
                    <Text style={[styles.td, { width: 220, fontWeight: "600" }]}>{c.customerName}</Text>
                    <Text style={[styles.td, { width: 70 }]}>{c.currency}</Text>
                    <Text style={[styles.td, { width: 100, textAlign: "right" }]}>{c.notDue.toFixed(2)}</Text>
                    <Text style={[styles.td, { width: 100, textAlign: "right" }]}>{c.d1_30.toFixed(2)}</Text>
                    <Text style={[styles.td, { width: 100, textAlign: "right", color: c.d31_60 > 0 ? colors.live : undefined }]}>
                      {c.d31_60.toFixed(2)}
                    </Text>
                    <Text style={[styles.td, { width: 100, textAlign: "right", color: c.d61_90 > 0 ? colors.live : undefined }]}>
                      {c.d61_90.toFixed(2)}
                    </Text>
                    <Text style={[styles.td, { width: 100, textAlign: "right", color: c.d90Plus > 0 ? colors.live : undefined }]}>
                      {c.d90Plus.toFixed(2)}
                    </Text>
                    <Text style={[styles.td, { width: 120, textAlign: "right", fontWeight: "700" }]}>
                      {c.totalOutstanding.toFixed(2)}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          ) : (
            <Text style={styles.emptySub}>No customer balances outstanding.</Text>
          )}
        </View>
      )}

      {/* 4. PAYMENTS LEDGER TAB */}
      {activeTab === "payments" && (
        <View style={styles.tabContent}>
          <View style={styles.toolbar}>
            <Text style={styles.sectionTitle}>Immutable Cash Receipts & Payment Ledger</Text>
          </View>
          <Text style={styles.sectionSub}>
            Every payment record is immutable and verified against overpayment constraints. Replays enforce exact idempotency.
          </Text>

          {paymentsData.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Zero Payment Records</Text>
              <Text style={styles.emptySub}>No payments have been recorded yet.</Text>
            </View>
          ) : (
            <ScrollView horizontal style={styles.tableScroll}>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.th, { width: 130 }]}>PAYMENT #</Text>
                  <Text style={[styles.th, { width: 130 }]}>INVOICE #</Text>
                  <Text style={[styles.th, { width: 180 }]}>CUSTOMER</Text>
                  <Text style={[styles.th, { width: 100 }]}>DATE</Text>
                  <Text style={[styles.th, { width: 120 }]}>METHOD</Text>
                  <Text style={[styles.th, { width: 120 }]}>REFERENCE</Text>
                  <Text style={[styles.th, { width: 110, textAlign: "right" }]}>AMOUNT</Text>
                  <Text style={[styles.th, { width: 160 }]}>RECORDED BY</Text>
                  <Text style={[styles.th, { width: 100 }]}>ACTIONS</Text>
                </View>
                {paymentsData.map((p) => (
                  <View key={p.id} style={styles.tableRow}>
                    <Text style={[styles.td, styles.codeText, { width: 130 }]}>{p.paymentNumber}</Text>
                    <Text style={[styles.td, styles.codeText, { width: 130 }]}>{p.invoiceNumber}</Text>
                    <Text style={[styles.td, { width: 180 }]} numberOfLines={1}>{p.customerName}</Text>
                    <Text style={[styles.td, { width: 100 }]}>{p.paymentDate}</Text>
                    <Text style={[styles.td, { width: 120 }]}>{p.paymentMethod.replace("_", " ").toUpperCase()}</Text>
                    <Text style={[styles.td, { width: 120 }]}>{p.reference ?? "—"}</Text>
                    <Text style={[styles.td, { width: 110, textAlign: "right", fontWeight: "700", color: colors.success }]}>
                      {p.currency} {p.amount.toFixed(2)}
                    </Text>
                    <Text style={[styles.td, { width: 160 }]}>{p.recordedByName ?? p.recordedBy ?? "Staff"}</Text>
                    <View style={[styles.tdCell, { width: 100 }]}>
                      <Pressable
                        style={styles.miniBtn}
                        onPress={() => {
                          setPrintPaymentItem(p);
                          setIsPrintReceiptModalOpen(true);
                        }}
                      >
                        <Text style={styles.miniBtnText}>Receipt</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      )}

      {/* 5. EXPENSES TAB */}
      {activeTab === "expenses" && (
        <View style={styles.tabContent}>
          <View style={styles.governanceNoticeBox} testID="expense-governance-notice">
            <Text style={styles.governanceNoticeTitle}>SEPARATION OF DUTIES · EXPENSE GOVERNANCE</Text>
            <Text style={styles.governanceNoticeText}>
              Newsroom expense policy enforces strict separation of duties: Staff members submit field claims, while line managers and Finance Desk verify and approve them. Self-approval is strictly prohibited in live operations. In this Owner Visual Preview, approval controls are simulated for interface demonstration only and do not establish live self-approval authority.
            </Text>
          </View>

          <View style={styles.toolbar}>
            <View style={styles.filterGroup}>
              <Pressable
                style={[styles.filterChip, expenseScope === "all" && styles.filterChipActive]}
                onPress={() => setExpenseScope("all")}
                accessibilityRole="button"
                accessibilityLabel="Show all newsroom expense claims"
                accessibilityState={{ selected: expenseScope === "all" }}
              >
                <Text style={[styles.filterChipText, expenseScope === "all" && styles.filterChipTextActive]}>
                  ALL NEWSROOM CLAIMS
                </Text>
              </Pressable>
              <Pressable
                style={[styles.filterChip, expenseScope === "my" && styles.filterChipActive]}
                onPress={() => setExpenseScope("my")}
                accessibilityRole="button"
                accessibilityLabel="Show my expense claims"
                accessibilityState={{ selected: expenseScope === "my" }}
              >
                <Text style={[styles.filterChipText, expenseScope === "my" && styles.filterChipTextActive]}>
                  MY EXPENSE CLAIMS
                </Text>
              </Pressable>
            </View>
            <Pressable
              style={styles.actionBtnPrimary}
              onPress={() => setIsExpenseModalOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Create a new expense claim"
            >
              <Text style={styles.actionBtnPrimaryText}>+ New Expense Claim</Text>
            </Pressable>
          </View>

          {expensesData.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No Expenses Filed</Text>
              <Text style={styles.emptySub}>No newsroom expense claims found.</Text>
            </View>
          ) : (
            <ScrollView horizontal style={styles.tableScroll}>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.th, { width: 120 }]}>EXPENSE #</Text>
                  <Text style={[styles.th, { width: 100 }]}>DATE</Text>
                  <Text style={[styles.th, { width: 150 }]}>VENDOR</Text>
                  <Text style={[styles.th, { width: 110 }]}>CATEGORY</Text>
                  <Text style={[styles.th, { width: 180 }]}>DESCRIPTION</Text>
                  <Text style={[styles.th, { width: 140 }]}>RECEIPT / EVIDENCE</Text>
                  <Text style={[styles.th, { width: 100, textAlign: "right" }]}>AMOUNT</Text>
                  <Text style={[styles.th, { width: 110, textAlign: "center" }]}>STATUS</Text>
                  <Text style={[styles.th, { width: 150 }]}>SUBMITTED BY</Text>
                  <Text style={[styles.th, { width: 180 }]}>ACTIONS</Text>
                </View>

                {expensesData.map((e) => (
                  <View key={e.id} style={styles.tableRow}>
                    <Text style={[styles.td, styles.codeText, { width: 120 }]}>{e.expenseNumber}</Text>
                    <Text style={[styles.td, { width: 100 }]}>{e.expenseDate}</Text>
                    <Text style={[styles.td, { width: 150 }]} numberOfLines={1}>{e.vendorName}</Text>
                    <Text style={[styles.td, { width: 110 }]}>{e.category.toUpperCase()}</Text>
                    <Text style={[styles.td, { width: 180 }]} numberOfLines={1}>{e.description}</Text>
                    <Text style={[styles.td, { width: 140 }]} numberOfLines={1}>
                      {e.receiptReference ? `📎 ${e.receiptReference}` : e.receiptUrl ? "📎 Attached file" : "None"}
                    </Text>
                    <Text style={[styles.td, { width: 100, textAlign: "right", fontWeight: "700" }]}>
                      {e.currency} {e.amount.toFixed(2)}
                    </Text>
                    <View style={[styles.tdCell, { width: 110, alignItems: "center" }]}>
                      <View style={[styles.badge, getExpenseBadgeStyle(e.status)]}>
                        <Text style={styles.badgeText}>{e.status.toUpperCase()}</Text>
                      </View>
                    </View>
                    <Text style={[styles.td, { width: 150 }]}>{e.submittedByName ?? e.submittedBy ?? "Reporter"}</Text>
                    <View style={[styles.tdCell, styles.rowActions, { width: 180 }]}>
                      {e.status === "submitted" && (
                        <Pressable style={styles.miniBtnPrimary} onPress={() => handleApproveExpense(e.id)}>
                          <Text style={styles.miniBtnPrimaryText}>Approve</Text>
                        </Pressable>
                      )}
                      {e.status === "approved" && e.paymentStatus !== "paid" && (
                        <Pressable style={styles.miniBtnSuccess} onPress={() => handlePayExpense(e.id)}>
                          <Text style={styles.miniBtnSuccessText}>Pay</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      )}

      {/* 6. STATEMENTS TAB */}
      {activeTab === "statements" && (
        <View style={styles.tabContent}>
          <View style={styles.glNoticeBox}>
            <Text style={styles.glNoticeTitle}>OPERATING FINANCIAL REPORTING AUTHORITY</Text>
            <Text style={styles.glNoticeBody}>
              {statementsData?.balanceSheet ??
                "NOT AVAILABLE UNTIL GENERAL LEDGER AUTHORITY EXISTS (POST-LAUNCH ACCOUNTING PHASE)"}
            </Text>
            <Text style={styles.glNoticeSub}>
              Statements reflect operational invoicing, advertising revenue by placement, cash receipts ledger, and approved expense claims.
            </Text>
          </View>

          {/* Income Statement Table */}
          <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>Operational Income Statement</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { width: 120 }]}>CURRENCY</Text>
              <Text style={[styles.th, { width: 150, textAlign: "right" }]}>BILLED REVENUE</Text>
              <Text style={[styles.th, { width: 150, textAlign: "right" }]}>APPROVED EXPENSES</Text>
              <Text style={[styles.th, { width: 180, textAlign: "right" }]}>NET OPERATING SURPLUS</Text>
            </View>
            {statementsData?.incomeStatement && statementsData.incomeStatement.length > 0 ? (
              statementsData.incomeStatement.map((inc) => (
                <View key={inc.currency} style={styles.tableRow}>
                  <Text style={[styles.td, { width: 120, fontWeight: "700" }]}>{inc.currency}</Text>
                  <Text style={[styles.td, { width: 150, textAlign: "right" }]}>{inc.revenue.toFixed(2)}</Text>
                  <Text style={[styles.td, { width: 150, textAlign: "right" }]}>{inc.expenses.toFixed(2)}</Text>
                  <Text
                    style={[
                      styles.td,
                      { width: 180, textAlign: "right", fontWeight: "700" },
                      inc.netOperatingSurplus >= 0 ? { color: colors.success } : { color: colors.live }
                    ]}
                  >
                    {inc.netOperatingSurplus.toFixed(2)}
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.tableRow}>
                <Text style={styles.td}>USD</Text>
                <Text style={styles.td}>0.00</Text>
                <Text style={styles.td}>0.00</Text>
                <Text style={styles.td}>0.00</Text>
              </View>
            )}
          </View>

          {/* Revenue by Placement */}
          <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Advertising Revenue by Placement</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { width: 220 }]}>PLACEMENT</Text>
              <Text style={[styles.th, { width: 100 }]}>CURRENCY</Text>
              <Text style={[styles.th, { width: 160, textAlign: "right" }]}>REVENUE</Text>
            </View>
            {statementsData?.revenueByPlacement && statementsData.revenueByPlacement.length > 0 ? (
              statementsData.revenueByPlacement.map((p, idx) => (
                <View key={p.placement + idx} style={styles.tableRow}>
                  <Text style={[styles.td, { width: 220, textTransform: "capitalize" }]}>
                    {p.placement.replace("_", " ")}
                  </Text>
                  <Text style={[styles.td, { width: 100 }]}>{p.currency}</Text>
                  <Text style={[styles.td, { width: 160, textAlign: "right", fontWeight: "600" }]}>
                    {p.revenue.toFixed(2)}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptySub}>No placement revenue recorded yet.</Text>
            )}
          </View>
        </View>
      )}

      {/* TRIAL BALANCE TAB */}
      {activeTab === "trial-balance" && (
        <View style={styles.tabContent}>
          <View style={styles.glBanner}>
            <View style={styles.glBannerLeft}>
              <Text style={styles.glBannerEyebrow}>GAAP GENERAL LEDGER · DOUBLE ENTRY</Text>
              <Text style={styles.glBannerTitle}>General Ledger Trial Balance</Text>
              <Text style={styles.glBannerSub}>
                Period: {trialBalanceData?.periodId ? "FY2026-Q4 (Oct–Dec 2026)" : "Current Fiscal Year"} · Currency: {trialBalanceData?.currency ?? "USD"}
              </Text>
            </View>
            <View style={[styles.balanceBadge, trialBalanceData?.isBalanced ? styles.balanceBadgeOk : styles.balanceBadgeWarn]}>
              <Text style={[styles.balanceBadgeText, trialBalanceData?.isBalanced ? styles.balanceBadgeTextOk : styles.balanceBadgeTextWarn]}>
                {trialBalanceData?.isBalanced ? "✓ LEDGER BALANCED" : "⚠️ UNBALANCED"}
              </Text>
            </View>
          </View>

          <ScrollView horizontal style={styles.tableScroll}>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, { width: 90 }]}>CODE</Text>
                <Text style={[styles.th, { width: 240 }]}>ACCOUNT NAME</Text>
                <Text style={[styles.th, { width: 110 }]}>TYPE</Text>
                <Text style={[styles.th, { width: 140, textAlign: "right" }]}>TOTAL DEBIT</Text>
                <Text style={[styles.th, { width: 140, textAlign: "right" }]}>TOTAL CREDIT</Text>
                <Text style={[styles.th, { width: 140, textAlign: "right" }]}>NET BALANCE</Text>
              </View>

              {(trialBalanceData?.accounts ?? []).map((acc) => (
                <View key={acc.accountId} style={styles.tableRow}>
                  <Text style={[styles.td, styles.codeText, { width: 90 }]}>{acc.accountCode}</Text>
                  <Text style={[styles.td, { width: 240, fontWeight: "600" }]}>{acc.accountName}</Text>
                  <Text style={[styles.td, { width: 110, fontSize: 11, color: colors.inkMuted }]}>{acc.accountType}</Text>
                  <Text style={[styles.td, { width: 140, textAlign: "right" }]}>
                    {acc.debitTotal > 0 ? acc.debitTotal.toFixed(2) : "—"}
                  </Text>
                  <Text style={[styles.td, { width: 140, textAlign: "right" }]}>
                    {acc.creditTotal > 0 ? acc.creditTotal.toFixed(2) : "—"}
                  </Text>
                  <Text style={[styles.td, { width: 140, textAlign: "right", fontWeight: "700" }]}>
                    {acc.netBalance.toFixed(2)}
                  </Text>
                </View>
              ))}

              <View style={[styles.tableRow, styles.totalsRow]}>
                <Text style={[styles.td, { width: 440, fontWeight: "900" }]}>TOTAL TRIAL BALANCE</Text>
                <Text style={[styles.td, { width: 140, textAlign: "right", fontWeight: "900" }]}>
                  {trialBalanceData?.currency ?? "USD"} {(trialBalanceData?.totalDebits ?? 0).toFixed(2)}
                </Text>
                <Text style={[styles.td, { width: 140, textAlign: "right", fontWeight: "900" }]}>
                  {trialBalanceData?.currency ?? "USD"} {(trialBalanceData?.totalCredits ?? 0).toFixed(2)}
                </Text>
                <Text style={[styles.td, { width: 140, textAlign: "right", fontWeight: "900", color: colors.success }]}>
                  {trialBalanceData?.isBalanced ? "BALANCED ✓" : "DIFF"}
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
      )}

      {/* PROFIT & LOSS TAB */}
      {activeTab === "pnl" && (
        <View style={styles.tabContent}>
          <View style={styles.glBanner}>
            <View style={styles.glBannerLeft}>
              <Text style={styles.glBannerEyebrow}>GAAP STATEMENT OF COMPREHENSIVE INCOME</Text>
              <Text style={styles.glBannerTitle}>Operating Profit & Loss Statement</Text>
              <Text style={styles.glBannerSub}>
                Period: {pnlData?.fromDate ?? "2026-10-01"} to {pnlData?.toDate ?? "2026-10-31"} · Reporting Currency: {pnlData?.currency ?? "USD"}
              </Text>
            </View>
            <View style={styles.surplusBox}>
              <Text style={styles.surplusLabel}>NET OPERATING SURPLUS</Text>
              <Text style={[styles.surplusValue, (pnlData?.netOperatingSurplus ?? 0) >= 0 ? styles.textSuccess : styles.textDanger]}>
                {pnlData?.currency ?? "USD"} {(pnlData?.netOperatingSurplus ?? 0).toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Operating Revenue Section */}
          <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>Operating Revenues (4000 Series)</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { width: 100 }]}>ACCOUNT</Text>
              <Text style={[styles.th, { width: 340 }]}>REVENUE SOURCE</Text>
              <Text style={[styles.th, { width: 180, textAlign: "right" }]}>AMOUNT ({pnlData?.currency ?? "USD"})</Text>
            </View>
            {(pnlData?.revenues ?? []).map((r) => (
              <View key={r.accountCode} style={styles.tableRow}>
                <Text style={[styles.td, styles.codeText, { width: 100 }]}>{r.accountCode}</Text>
                <Text style={[styles.td, { width: 340, fontWeight: "600" }]}>{r.accountName}</Text>
                <Text style={[styles.td, { width: 180, textAlign: "right", fontWeight: "700" }]}>
                  {r.amount.toFixed(2)}
                </Text>
              </View>
            ))}
            <View style={[styles.tableRow, styles.subtotalRow]}>
              <Text style={[styles.td, { width: 440, fontWeight: "800" }]}>Total Operating Revenues</Text>
              <Text style={[styles.td, { width: 180, textAlign: "right", fontWeight: "900", color: colors.success }]}>
                {pnlData?.currency ?? "USD"} {(pnlData?.totalRevenue ?? 0).toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Operating Expenses Section */}
          <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Operating Expenses (5000 Series)</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { width: 100 }]}>ACCOUNT</Text>
              <Text style={[styles.th, { width: 340 }]}>EXPENSE CATEGORY</Text>
              <Text style={[styles.th, { width: 180, textAlign: "right" }]}>AMOUNT ({pnlData?.currency ?? "USD"})</Text>
            </View>
            {(pnlData?.expenses ?? []).map((e) => (
              <View key={e.accountCode} style={styles.tableRow}>
                <Text style={[styles.td, styles.codeText, { width: 100 }]}>{e.accountCode}</Text>
                <Text style={[styles.td, { width: 340, fontWeight: "600" }]}>{e.accountName}</Text>
                <Text style={[styles.td, { width: 180, textAlign: "right" }]}>
                  {e.amount.toFixed(2)}
                </Text>
              </View>
            ))}
            <View style={[styles.tableRow, styles.subtotalRow]}>
              <Text style={[styles.td, { width: 440, fontWeight: "800" }]}>Total Operating Expenses</Text>
              <Text style={[styles.td, { width: 180, textAlign: "right", fontWeight: "900", color: colors.live }]}>
                {pnlData?.currency ?? "USD"} {(pnlData?.totalExpenses ?? 0).toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Bottom Net Line */}
          <View style={styles.netOperatingLine}>
            <Text style={styles.netOperatingLineTitle}>NET OPERATING SURPLUS / (DEFICIT)</Text>
            <Text style={[styles.netOperatingLineVal, (pnlData?.netOperatingSurplus ?? 0) >= 0 ? styles.textSuccess : styles.textDanger]}>
              {pnlData?.currency ?? "USD"} {(pnlData?.netOperatingSurplus ?? 0).toFixed(2)}
            </Text>
          </View>
        </View>
      )}

      {/* BALANCE SHEET TAB */}
      {activeTab === "balance-sheet" && (
        <View style={styles.tabContent}>
          <View style={styles.glBanner}>
            <View style={styles.glBannerLeft}>
              <Text style={styles.glBannerEyebrow}>GAAP STATEMENT OF FINANCIAL POSITION</Text>
              <Text style={styles.glBannerTitle}>Balance Sheet Statement</Text>
              <Text style={styles.glBannerSub}>
                As of: {balanceSheetData?.asOfDate ?? "2026-10-31"} · Reporting Currency: {balanceSheetData?.currency ?? "USD"}
              </Text>
            </View>
            <View style={[styles.balanceBadge, balanceSheetData?.isBalanced ? styles.balanceBadgeOk : styles.balanceBadgeWarn]}>
              <Text style={[styles.balanceBadgeText, balanceSheetData?.isBalanced ? styles.balanceBadgeTextOk : styles.balanceBadgeTextWarn]}>
                {balanceSheetData?.isBalanced ? "✓ EQUATION VERIFIED" : "⚠️ UNBALANCED"}
              </Text>
            </View>
          </View>

          {/* Assets Section */}
          <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>Assets (1000 Series)</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { width: 100 }]}>ACCOUNT</Text>
              <Text style={[styles.th, { width: 340 }]}>CURRENT ASSET</Text>
              <Text style={[styles.th, { width: 180, textAlign: "right" }]}>AMOUNT ({balanceSheetData?.currency ?? "USD"})</Text>
            </View>
            {(balanceSheetData?.assets ?? []).map((a) => (
              <View key={a.accountCode} style={styles.tableRow}>
                <Text style={[styles.td, styles.codeText, { width: 100 }]}>{a.accountCode}</Text>
                <Text style={[styles.td, { width: 340, fontWeight: "600" }]}>{a.accountName}</Text>
                <Text style={[styles.td, { width: 180, textAlign: "right", fontWeight: "700" }]}>
                  {a.amount.toFixed(2)}
                </Text>
              </View>
            ))}
            <View style={[styles.tableRow, styles.subtotalRow]}>
              <Text style={[styles.td, { width: 440, fontWeight: "800" }]}>Total Assets</Text>
              <Text style={[styles.td, { width: 180, textAlign: "right", fontWeight: "900", color: colors.ink }]}>
                {balanceSheetData?.currency ?? "USD"} {(balanceSheetData?.totalAssets ?? 0).toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Liabilities Section */}
          <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Liabilities (2000 Series)</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { width: 100 }]}>ACCOUNT</Text>
              <Text style={[styles.th, { width: 340 }]}>CURRENT LIABILITY</Text>
              <Text style={[styles.th, { width: 180, textAlign: "right" }]}>AMOUNT ({balanceSheetData?.currency ?? "USD"})</Text>
            </View>
            {(balanceSheetData?.liabilities ?? []).map((l) => (
              <View key={l.accountCode} style={styles.tableRow}>
                <Text style={[styles.td, styles.codeText, { width: 100 }]}>{l.accountCode}</Text>
                <Text style={[styles.td, { width: 340, fontWeight: "600" }]}>{l.accountName}</Text>
                <Text style={[styles.td, { width: 180, textAlign: "right" }]}>
                  {l.amount.toFixed(2)}
                </Text>
              </View>
            ))}
            <View style={[styles.tableRow, styles.subtotalRow]}>
              <Text style={[styles.td, { width: 440, fontWeight: "800" }]}>Total Liabilities</Text>
              <Text style={[styles.td, { width: 180, textAlign: "right", fontWeight: "900", color: colors.ink }]}>
                {balanceSheetData?.currency ?? "USD"} {(balanceSheetData?.totalLiabilities ?? 0).toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Equity Section */}
          <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Equity & Retained Surplus (3000 Series)</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { width: 100 }]}>ACCOUNT</Text>
              <Text style={[styles.th, { width: 340 }]}>EQUITY & RESERVES</Text>
              <Text style={[styles.th, { width: 180, textAlign: "right" }]}>AMOUNT ({balanceSheetData?.currency ?? "USD"})</Text>
            </View>
            {(balanceSheetData?.equity ?? []).map((e) => (
              <View key={e.accountCode} style={styles.tableRow}>
                <Text style={[styles.td, styles.codeText, { width: 100 }]}>{e.accountCode}</Text>
                <Text style={[styles.td, { width: 340, fontWeight: "600" }]}>{e.accountName}</Text>
                <Text style={[styles.td, { width: 180, textAlign: "right" }]}>
                  {e.amount.toFixed(2)}
                </Text>
              </View>
            ))}
            <View style={[styles.tableRow, styles.subtotalRow]}>
              <Text style={[styles.td, { width: 440, fontWeight: "800" }]}>Total Equity</Text>
              <Text style={[styles.td, { width: 180, textAlign: "right", fontWeight: "900", color: colors.ink }]}>
                {balanceSheetData?.currency ?? "USD"} {(balanceSheetData?.totalEquity ?? 0).toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Equation Check Footer */}
          <View style={styles.netOperatingLine}>
            <Text style={styles.netOperatingLineTitle}>TOTAL LIABILITIES & EQUITY (MUST EQUAL ASSETS)</Text>
            <Text style={[styles.netOperatingLineVal, { color: colors.ink }]}>
              {balanceSheetData?.currency ?? "USD"} {(balanceSheetData?.totalLiabilitiesAndEquity ?? 0).toFixed(2)}
            </Text>
          </View>
        </View>
      )}

      {/* GL JOURNALS TAB */}
      {activeTab === "journals" && (
        <View style={styles.tabContent}>
          <View style={styles.toolbar}>
            <View>
              <Text style={styles.sectionTitle}>General Ledger Journal Entries</Text>
              <Text style={styles.sectionSub}>
                Immutable double-entry audit records. Every operational invoice, cash receipt, and approved expense posts debit/credit entries here.
              </Text>
            </View>
          </View>

          {journalsData.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Zero Journal Entries</Text>
              <Text style={styles.emptySub}>No journal entries recorded yet.</Text>
            </View>
          ) : (
            <View style={{ gap: spacing.md }}>
              {journalsData.map((j) => (
                <View key={j.id} style={styles.journalCard}>
                  <View style={styles.journalCardHeader}>
                    <View style={{ gap: 2 }}>
                      <Text style={styles.journalCardNum}>{j.entryNumber}</Text>
                      <Text style={styles.journalCardDate}>
                        Date: {j.entryDate} · Source: {j.source.toUpperCase()} · Status: {j.status.toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center" }}>
                      <View style={[styles.badge, j.status === "posted" ? styles.badgeSuccess : styles.badgeMuted]}>
                        <Text style={styles.badgeText}>{j.status.toUpperCase()}</Text>
                      </View>
                      {j.status === "posted" && (
                        <Pressable
                          style={styles.miniBtnDanger}
                          onPress={() => {
                            setReverseJournalEntry(j);
                            setIsReverseJournalModalOpen(true);
                          }}
                        >
                          <Text style={styles.miniBtnDangerText}>Reverse Entry</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                  <Text style={styles.journalCardMemo}>{j.memo}</Text>

                  {/* Lines Table */}
                  <View style={[styles.table, { marginTop: spacing.sm }]}>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.th, { width: 80 }]}>LINE #</Text>
                      <Text style={[styles.th, { width: 90 }]}>ACCOUNT</Text>
                      <Text style={[styles.th, { width: 220 }]}>NAME</Text>
                      <Text style={[styles.th, { width: 120, textAlign: "right" }]}>DEBIT ({j.currency})</Text>
                      <Text style={[styles.th, { width: 120, textAlign: "right" }]}>CREDIT ({j.currency})</Text>
                      <Text style={[styles.th, { width: 180 }]}>DESCRIPTION</Text>
                    </View>
                    {j.lines.map((l) => (
                      <View key={l.lineNumber} style={styles.tableRow}>
                        <Text style={[styles.td, { width: 80 }]}>{l.lineNumber}</Text>
                        <Text style={[styles.td, styles.codeText, { width: 90 }]}>{l.accountCode ?? "—"}</Text>
                        <Text style={[styles.td, { width: 220 }]} numberOfLines={1}>{l.accountName ?? "—"}</Text>
                        <Text style={[styles.td, { width: 120, textAlign: "right", fontWeight: l.debit > 0 ? "700" : "400" }]}>
                          {l.debit > 0 ? l.debit.toFixed(2) : "—"}
                        </Text>
                        <Text style={[styles.td, { width: 120, textAlign: "right", fontWeight: l.credit > 0 ? "700" : "400" }]}>
                          {l.credit > 0 ? l.credit.toFixed(2) : "—"}
                        </Text>
                        <Text style={[styles.td, { width: 180 }]} numberOfLines={1}>{l.description}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* 7. ORDERS TAB */}
      {activeTab === "orders" && (
        <View style={styles.tabContent}>
          <View style={styles.toolbar}>
            <Text style={styles.sectionTitle}>Commercial Orders & Booking Contracts</Text>
            <Pressable
              style={styles.actionBtnPrimary}
              onPress={() => {
                setNewOrderCustomerId(customersData[0]?.id ?? "");
                setNewOrderSubtotal("500.00");
                setNewOrderTax("75.00");
                setNewOrderDiscount("0");
                setNewOrderStartDate(new Date().toISOString().slice(0, 10));
                setNewOrderEndDate("");
                setNewOrderNotes("");
                setIsOrderModalOpen(true);
              }}
              testID="orders-create-order-btn"
            >
              <Text style={styles.actionBtnPrimaryText}>+ New Commercial Order</Text>
            </Pressable>
          </View>
          {ordersData.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Zero Commercial Orders</Text>
              <Text style={styles.emptySub}>No commercial booking orders created yet.</Text>
            </View>
          ) : (
            <ScrollView horizontal style={styles.tableScroll}>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.th, { width: 130 }]}>ORDER #</Text>
                  <Text style={[styles.th, { width: 180 }]}>CUSTOMER</Text>
                  <Text style={[styles.th, { width: 100 }]}>CURRENCY</Text>
                  <Text style={[styles.th, { width: 110, textAlign: "right" }]}>TOTAL</Text>
                  <Text style={[styles.th, { width: 120, textAlign: "center" }]}>STATUS</Text>
                  <Text style={[styles.th, { width: 120, textAlign: "center" }]}>BILLING</Text>
                  <Text style={[styles.th, { width: 240 }]}>ACTIONS</Text>
                </View>
                {ordersData.map((ord) => (
                  <View key={ord.id} style={styles.tableRow}>
                    <Text style={[styles.td, styles.codeText, { width: 130 }]}>{ord.orderNumber}</Text>
                    <Text style={[styles.td, { width: 180 }]}>{ord.customerName ?? ord.customerId}</Text>
                    <Text style={[styles.td, { width: 100 }]}>{ord.currency}</Text>
                    <Text style={[styles.td, { width: 110, textAlign: "right", fontWeight: "700" }]}>
                      {ord.total.toFixed(2)}
                    </Text>
                    <View style={[styles.tdCell, { width: 120, alignItems: "center" }]}>
                      <View style={[styles.badge, getStatusBadgeStyle(ord.status)]}>
                        <Text style={styles.badgeText}>{ord.status.toUpperCase()}</Text>
                      </View>
                    </View>
                    <View style={[styles.tdCell, { width: 120, alignItems: "center" }]}>
                      <View style={[styles.badge, getStatusBadgeStyle(ord.billingStatus)]}>
                        <Text style={styles.badgeText}>{ord.billingStatus.toUpperCase()}</Text>
                      </View>
                    </View>
                    <View style={[styles.tdCell, styles.rowActions, { width: 240 }]}>
                      <Pressable
                        style={styles.miniBtn}
                        onPress={() => setInspectedOrder(ord)}
                        accessibilityRole="button"
                        accessibilityLabel={`View details for order ${ord.orderNumber}`}
                      >
                        <Text style={styles.miniBtnText}>Details</Text>
                      </Pressable>
                      {ord.status === "draft" && (
                        <Pressable
                          style={styles.miniBtnSuccess}
                          onPress={() => handleApproveOrder(ord.id)}
                          accessibilityRole="button"
                          accessibilityLabel={`Approve order ${ord.orderNumber}`}
                        >
                          <Text style={styles.miniBtnSuccessText}>Approve</Text>
                        </Pressable>
                      )}
                      {ord.billingStatus !== "billed" && (
                        <Pressable
                          style={styles.miniBtnPrimary}
                          onPress={() => {
                            setNewInvCustomerId(ord.customerId);
                            setNewInvOrderId(ord.id);
                            setNewInvCurrency(ord.currency);
                            setNewInvDesc(ord.notes || `Media placement for ${ord.orderNumber}`);
                            setNewInvUnitPrice(String(ord.subtotal));
                            setNewInvQty("1");
                            setNewInvTaxRate(ord.subtotal > 0 ? String(Number((ord.taxAmount / ord.subtotal).toFixed(4))) : "0");
                            setIsInvoiceModalOpen(true);
                          }}
                        >
                          <Text style={styles.miniBtnPrimaryText}>Generate Invoice</Text>
                        </Pressable>
                      )}
                      <Pressable
                        style={styles.miniBtn}
                        onPress={() => setActiveTab("invoices")}
                      >
                        <Text style={styles.miniBtnText}>Invoices →</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}

          {inspectedOrder && (
            <View style={styles.detailSummaryCard} testID="finance-order-detail">
              <View style={styles.toolbar}>
                <View>
                  <Text style={styles.sectionTitle}>{inspectedOrder.orderNumber}</Text>
                  <Text style={styles.sectionSub}>{inspectedOrder.customerName} · {inspectedOrder.campaignName ?? "No campaign"}</Text>
                </View>
                <Pressable onPress={() => setInspectedOrder(null)} accessibilityRole="button" accessibilityLabel="Close order details">
                  <Text style={styles.miniBtnText}>Close</Text>
                </Pressable>
              </View>
              <Text style={styles.sectionSub}>{inspectedOrder.notes ?? "No order notes"}</Text>
              <Text style={styles.detailSummaryText}>Flight: {inspectedOrder.startDate ?? "Not set"} to {inspectedOrder.endDate ?? "Not set"}</Text>
              <Text style={styles.detailSummaryText}>Subtotal: {inspectedOrder.currency} {inspectedOrder.subtotal.toFixed(2)} · Tax: {inspectedOrder.currency} {inspectedOrder.taxAmount.toFixed(2)} · Discount: {inspectedOrder.currency} {inspectedOrder.discountAmount.toFixed(2)} · Total: {inspectedOrder.currency} {inspectedOrder.total.toFixed(2)}</Text>
            </View>
          )}
        </View>
      )}

      {/* 8. CUSTOMERS TAB */}
      {activeTab === "customers" && (
        <View style={styles.tabContent}>
          <View style={styles.toolbar}>
            <Text style={styles.sectionTitle}>Billing Customers & Accounts</Text>
            <Pressable
              style={styles.actionBtnPrimary}
              onPress={() => {
                setNewCustLegalName("");
                setNewCustTradingName("");
                setNewCustEmail("");
                setNewCustPhone("");
                setNewCustAddress("");
                setNewCustTaxId("");
                setNewCustCurrency("USD");
                setNewCustTerms("30");
                setIsCustomerModalOpen(true);
              }}
              testID="finance-create-customer-btn"
            >
              <Text style={styles.actionBtnPrimaryText}>+ New Customer</Text>
            </Pressable>
          </View>
          {customersData.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Zero Customers</Text>
              <Text style={styles.emptySub}>No commercial billing accounts recorded yet.</Text>
            </View>
          ) : (
            <ScrollView horizontal style={styles.tableScroll}>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.th, { width: 220 }]}>NAME</Text>
                  <Text style={[styles.th, { width: 200 }]}>BILLING EMAIL</Text>
                  <Text style={[styles.th, { width: 80 }]}>CURR</Text>
                  <Text style={[styles.th, { width: 90 }]}>TERMS</Text>
                  <Text style={[styles.th, { width: 110 }]}>TAX #</Text>
                  <Text style={[styles.th, { width: 180 }]}>ACTIONS</Text>
                </View>
                {customersData.map((cust) => (
                  <View key={cust.id} style={styles.tableRow}>
                    <Text style={[styles.td, { width: 220, fontWeight: "600" }]}>{cust.name}</Text>
                    <Text style={[styles.td, { width: 200 }]}>{cust.billingEmail}</Text>
                    <Text style={[styles.td, { width: 80 }]}>{cust.currency}</Text>
                    <Text style={[styles.td, { width: 90 }]}>{cust.paymentTermsDays} days</Text>
                    <Text style={[styles.td, { width: 110 }]}>{cust.taxNumber ?? "—"}</Text>
                    <View style={[styles.tdCell, styles.rowActions, { width: 180 }]}>
                      <Pressable
                        style={styles.miniBtnPrimary}
                        onPress={() => handleOpenCustomerStatement(cust)}
                      >
                        <Text style={styles.miniBtnPrimaryText}>Statement</Text>
                      </Pressable>
                      <Pressable
                        style={styles.miniBtn}
                        onPress={() => {
                          setNewOrderCustomerId(cust.id);
                          setNewOrderCurrency(cust.currency ?? "USD");
                          setActiveTab("orders");
                          setIsOrderModalOpen(true);
                        }}
                      >
                        <Text style={styles.miniBtnText}>+ Order</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      )}

      {/* MODAL: CREATE INVOICE */}
      <Modal visible={isInvoiceModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Create Commercial Invoice</Text>
            <Text style={styles.modalSub}>Bill an advertiser for media placements, sponsored articles, or newsletters.</Text>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.formLabel}>Customer / Advertiser</Text>
              {customersData.length > 0 ? (
                <View style={styles.customerPickerRow}>
                  {customersData.map((c) => (
                    <Pressable
                      key={c.id}
                      style={[styles.pickerChip, newInvCustomerId === c.id && styles.pickerChipActive]}
                      onPress={() => setNewInvCustomerId(c.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Select customer ${c.name}`}
                      accessibilityState={{ selected: newInvCustomerId === c.id }}
                    >
                      <Text style={[styles.pickerChipText, newInvCustomerId === c.id && styles.pickerChipTextActive]}>
                        {c.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <TextInput
                  style={styles.input}
                  placeholder="Select or enter customer UUID"
                  value={newInvCustomerId}
                  onChangeText={setNewInvCustomerId}
                  accessibilityLabel="Invoice customer"
                />
              )}

              <Text style={styles.formLabel}>Description</Text>
              <TextInput style={styles.input} value={newInvDesc} onChangeText={setNewInvDesc} accessibilityLabel="Invoice description" />

              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.formLabel}>Placement</Text>
                  <TextInput style={styles.input} value={newInvPlacement} onChangeText={setNewInvPlacement} accessibilityLabel="Invoice placement" />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.formLabel}>Currency</Text>
                  <TextInput style={styles.input} value={newInvCurrency} onChangeText={setNewInvCurrency} accessibilityLabel="Invoice currency" />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.formLabel}>Quantity</Text>
                  <TextInput style={styles.input} value={newInvQty} onChangeText={setNewInvQty} keyboardType="numeric" accessibilityLabel="Invoice quantity" />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.formLabel}>Unit Price ({newInvCurrency})</Text>
                  <TextInput style={styles.input} value={newInvUnitPrice} onChangeText={setNewInvUnitPrice} keyboardType="numeric" accessibilityLabel="Invoice unit price" />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.formLabel}>Tax Rate (0.15 = 15%)</Text>
                  <TextInput style={styles.input} value={newInvTaxRate} onChangeText={setNewInvTaxRate} keyboardType="numeric" accessibilityLabel="Invoice tax rate" />
                </View>
              </View>

              <View style={styles.calcSummaryBox}>
                <Text style={styles.calcLabel}>Estimated Total (incl. tax):</Text>
                <Text style={styles.calcValue}>
                  {newInvCurrency}{" "}
                  {(
                    (parseFloat(newInvQty) || 1) *
                    (parseFloat(newInvUnitPrice) || 0) *
                    (1 + (parseFloat(newInvTaxRate) || 0))
                  ).toFixed(2)}
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setIsInvoiceModalOpen(false)} accessibilityRole="button" accessibilityLabel="Cancel invoice creation">
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalSubmitBtn} onPress={handleCreateInvoice} accessibilityRole="button" accessibilityLabel="Save draft invoice">
                <Text style={styles.modalSubmitText}>Save Draft Invoice</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: CREATE CUSTOMER */}
      <Modal visible={isCustomerModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Add Billing Customer</Text>
            <Text style={styles.modalSub}>Create a corporate advertiser profile and billing account.</Text>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.formLabel}>Legal Company Name *</Text>
              <TextInput
                style={styles.input}
                value={newCustLegalName}
                onChangeText={setNewCustLegalName}
                placeholder="e.g. HealthCare Holdings Ltd"
                accessibilityLabel="Legal Company Name"
              />

              <Text style={styles.formLabel}>Trading / Brand Name</Text>
              <TextInput
                style={styles.input}
                value={newCustTradingName}
                onChangeText={setNewCustTradingName}
                placeholder="e.g. HealthCare Online"
                accessibilityLabel="Trading Name"
              />

              <Text style={styles.formLabel}>Billing Email *</Text>
              <TextInput
                style={styles.input}
                value={newCustEmail}
                onChangeText={setNewCustEmail}
                placeholder="finance@advertiser.co.zw"
                keyboardType="email-address"
                autoCapitalize="none"
                accessibilityLabel="Billing Email"
              />

              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.formLabel}>Billing Phone</Text>
                  <TextInput
                    style={styles.input}
                    value={newCustPhone}
                    onChangeText={setNewCustPhone}
                    placeholder="+263 77..."
                    accessibilityLabel="Billing Phone"
                  />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.formLabel}>Tax / VAT Number</Text>
                  <TextInput
                    style={styles.input}
                    value={newCustTaxId}
                    onChangeText={setNewCustTaxId}
                    placeholder="BP / VAT #"
                    accessibilityLabel="Tax Identifier"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.formLabel}>Preferred Currency</Text>
                  <View style={styles.pickerRow}>
                    {["USD", "ZWG"].map((c) => (
                      <Pressable
                        key={c}
                        style={[styles.pickerChip, newCustCurrency === c && styles.pickerChipActive]}
                        onPress={() => setNewCustCurrency(c)}
                        accessibilityRole="button"
                        accessibilityLabel={`Currency ${c}`}
                      >
                        <Text style={[styles.pickerChipText, newCustCurrency === c && styles.pickerChipTextActive]}>
                          {c}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.formLabel}>Payment Terms (Days)</Text>
                  <TextInput
                    style={styles.input}
                    value={newCustTerms}
                    onChangeText={setNewCustTerms}
                    keyboardType="numeric"
                    accessibilityLabel="Payment Terms Days"
                  />
                </View>
              </View>

              <Text style={styles.formLabel}>Billing Address</Text>
              <TextInput
                style={styles.input}
                value={newCustAddress}
                onChangeText={setNewCustAddress}
                placeholder="Corporate Office, Harare"
                accessibilityLabel="Billing Address"
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelBtn}
                onPress={() => setIsCustomerModalOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Cancel customer creation"
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.modalSubmitBtn}
                onPress={handleSaveCustomer}
                accessibilityRole="button"
                accessibilityLabel="Save Customer"
              >
                <Text style={styles.modalSubmitText}>Save Customer</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: CREATE ORDER */}
      <Modal visible={isOrderModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Create Commercial Booking Order</Text>
            <Text style={styles.modalSub}>Reserve advertising inventory, newsletter sponsorships, or custom series.</Text>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.formLabel}>Customer / Advertiser *</Text>
              {customersData.length > 0 ? (
                <View style={styles.customerPickerRow}>
                  {customersData.map((c) => (
                    <Pressable
                      key={c.id}
                      style={[styles.pickerChip, newOrderCustomerId === c.id && styles.pickerChipActive]}
                      onPress={() => setNewOrderCustomerId(c.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Select customer ${c.name}`}
                      accessibilityState={{ selected: newOrderCustomerId === c.id }}
                    >
                      <Text style={[styles.pickerChipText, newOrderCustomerId === c.id && styles.pickerChipTextActive]}>
                        {c.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <TextInput
                  style={styles.input}
                  placeholder="Enter Customer UUID"
                  value={newOrderCustomerId}
                  onChangeText={setNewOrderCustomerId}
                  accessibilityLabel="Order Customer"
                />
              )}

              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.formLabel}>Start Date</Text>
                  <TextInput
                    style={styles.input}
                    value={newOrderStartDate}
                    onChangeText={setNewOrderStartDate}
                    placeholder="YYYY-MM-DD"
                    accessibilityLabel="Order Start Date"
                  />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.formLabel}>End Date</Text>
                  <TextInput
                    style={styles.input}
                    value={newOrderEndDate}
                    onChangeText={setNewOrderEndDate}
                    placeholder="YYYY-MM-DD"
                    accessibilityLabel="Order End Date"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.formLabel}>Currency</Text>
                  <View style={styles.pickerRow}>
                    {["USD", "ZWG"].map((c) => (
                      <Pressable
                        key={c}
                        style={[styles.pickerChip, newOrderCurrency === c && styles.pickerChipActive]}
                        onPress={() => setNewOrderCurrency(c)}
                        accessibilityRole="button"
                        accessibilityLabel={`Currency ${c}`}
                      >
                        <Text style={[styles.pickerChipText, newOrderCurrency === c && styles.pickerChipTextActive]}>
                          {c}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.formLabel}>Subtotal ({newOrderCurrency}) *</Text>
                  <TextInput
                    style={styles.input}
                    value={newOrderSubtotal}
                    onChangeText={setNewOrderSubtotal}
                    keyboardType="numeric"
                    accessibilityLabel="Order Subtotal"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.formLabel}>Tax Amount ({newOrderCurrency})</Text>
                  <TextInput
                    style={styles.input}
                    value={newOrderTax}
                    onChangeText={setNewOrderTax}
                    keyboardType="numeric"
                    accessibilityLabel="Order Tax Amount"
                  />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.formLabel}>Discount Amount ({newOrderCurrency})</Text>
                  <TextInput
                    style={styles.input}
                    value={newOrderDiscount}
                    onChangeText={setNewOrderDiscount}
                    keyboardType="numeric"
                    accessibilityLabel="Order Discount Amount"
                  />
                </View>
              </View>

              <View style={styles.calcSummaryBox}>
                <Text style={styles.calcLabel}>Estimated Total Order Value:</Text>
                <Text style={styles.calcValue}>
                  {newOrderCurrency}{" "}
                  {(
                    (parseFloat(newOrderSubtotal) || 0) +
                    (parseFloat(newOrderTax) || 0) -
                    (parseFloat(newOrderDiscount) || 0)
                  ).toFixed(2)}
                </Text>
              </View>

              <Text style={styles.formLabel}>Notes & Deliverables</Text>
              <TextInput
                style={styles.input}
                value={newOrderNotes}
                onChangeText={setNewOrderNotes}
                placeholder="Placement flight specifications, banner units, sponsor guidelines"
                accessibilityLabel="Order Notes"
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelBtn}
                onPress={() => setIsOrderModalOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Cancel order creation"
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.modalSubmitBtn}
                onPress={handleSaveOrder}
                accessibilityRole="button"
                accessibilityLabel="Save Commercial Order"
              >
                <Text style={styles.modalSubmitText}>Save Commercial Order</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: RECORD PAYMENT */}
      <Modal visible={isPaymentModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Record Customer Payment</Text>
            <Text style={styles.modalSub}>
              Invoice: {selectedInvoice?.invoiceNumber} • Balance Due: {selectedInvoice?.currency}{" "}
              {selectedInvoice?.balanceDue.toFixed(2)}
            </Text>

            <View style={styles.modalForm}>
              <Text style={styles.formLabel}>Payment Amount ({selectedInvoice?.currency})</Text>
              <TextInput
                style={styles.input}
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                keyboardType="numeric"
                placeholder="Amount"
                accessibilityLabel="Payment amount"
              />

              <Text style={styles.formLabel}>Payment Method</Text>
              <View style={styles.pickerRow}>
                {["bank_transfer", "paynow", "cash", "ecocash", "card"].map((m) => (
                  <Pressable
                    key={m}
                    style={[styles.pickerChip, paymentMethod === m && styles.pickerChipActive]}
                    onPress={() => setPaymentMethod(m)}
                    accessibilityRole="button"
                    accessibilityLabel={`Select payment method ${m.replace("_", " ")}`}
                    accessibilityState={{ selected: paymentMethod === m }}
                  >
                    <Text style={[styles.pickerChipText, paymentMethod === m && styles.pickerChipTextActive]}>
                      {m.replace("_", " ").toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.formLabel}>Reference / Receipt Number</Text>
              <TextInput
                style={styles.input}
                value={paymentRef}
                onChangeText={setPaymentRef}
                placeholder="e.g. STANBIC-REF-1092"
                accessibilityLabel="Payment reference"
              />
            </View>

            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setIsPaymentModalOpen(false)} accessibilityRole="button" accessibilityLabel="Cancel payment recording">
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalSubmitBtn} onPress={handleRecordPayment} accessibilityRole="button" accessibilityLabel="Record customer payment">
                <Text style={styles.modalSubmitText}>Post Immutable Payment</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: SUBMIT EXPENSE */}
      <Modal visible={isExpenseModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Submit Newsroom Expense Claim</Text>
            <Text style={styles.modalSub}>Submit field reporting costs, travel, freelance fees, or office expenses.</Text>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.formLabel}>Vendor / Payee</Text>
              <TextInput
                style={styles.input}
                value={expVendor}
                onChangeText={setExpVendor}
                placeholder="e.g. Harare Taxi Co / Freelance Photographer"
                accessibilityLabel="Expense vendor or payee"
              />

              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.formLabel}>Category</Text>
                  <TextInput style={styles.input} value={expCategory} onChangeText={setExpCategory} accessibilityLabel="Expense category" />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.formLabel}>Department</Text>
                  <TextInput style={styles.input} value={expDept} onChangeText={setExpDept} accessibilityLabel="Expense department" />
                </View>
              </View>

              <Text style={styles.formLabel}>Description / Purpose</Text>
              <TextInput
                style={styles.input}
                value={expDesc}
                onChangeText={setExpDesc}
                placeholder="Field investigation trip to Mutare"
                accessibilityLabel="Expense description or business purpose"
              />

              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.formLabel}>Amount</Text>
                  <TextInput
                    style={styles.input}
                    value={expAmount}
                    onChangeText={setExpAmount}
                    keyboardType="numeric"
                    placeholder="0.00"
                    accessibilityLabel="Expense amount"
                  />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.formLabel}>Currency</Text>
                  <TextInput style={styles.input} value={expCurrency} onChangeText={setExpCurrency} accessibilityLabel="Expense currency" />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.formLabel}>Expense Date</Text>
                  <TextInput
                    style={styles.input}
                    value={expDate}
                    onChangeText={setExpDate}
                    placeholder="YYYY-MM-DD"
                    accessibilityLabel="Expense date"
                  />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.formLabel}>Receipt / Supporting Evidence</Text>
                  <TextInput
                    style={styles.input}
                    value={expReceiptEvidence}
                    onChangeText={setExpReceiptEvidence}
                    placeholder="e.g. RCPT-4091 or receipt.pdf"
                    accessibilityLabel="Receipt or supporting evidence reference"
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setIsExpenseModalOpen(false)} accessibilityRole="button" accessibilityLabel="Cancel expense claim">
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalSubmitBtn} onPress={handleCreateExpense} accessibilityRole="button" accessibilityLabel="Submit expense claim">
                <Text style={styles.modalSubmitText}>Submit Claim</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: ISSUE CREDIT NOTE */}
      <Modal visible={isCreditNoteModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Issue Credit Note</Text>
            <Text style={styles.modalSub}>
              Issue an authorized credit adjustment against invoice {creditNoteInvoice?.invoiceNumber}. This posts a General Ledger revenue adjustment journal.
            </Text>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.formLabel}>Invoice Reference</Text>
              <View style={styles.disabledInputBox}>
                <Text style={styles.disabledInputText}>{creditNoteInvoice?.invoiceNumber} ({creditNoteInvoice?.customerName})</Text>
              </View>

              <Text style={styles.formLabel}>Invoice Total / Remaining Balance</Text>
              <View style={styles.disabledInputBox}>
                <Text style={styles.disabledInputText}>
                  {creditNoteInvoice?.currency} {creditNoteInvoice?.total.toFixed(2)} (Balance Due: {creditNoteInvoice?.balanceDue.toFixed(2)})
                </Text>
              </View>

              <Text style={styles.formLabel}>Credit Amount ({creditNoteInvoice?.currency ?? "USD"})</Text>
              <TextInput
                style={styles.input}
                value={creditNoteAmount}
                onChangeText={setCreditNoteAmount}
                keyboardType="numeric"
                placeholder="0.00"
              />

              <Text style={styles.formLabel}>Reason / Audit Memo</Text>
              <TextInput
                style={styles.input}
                value={creditNoteReason}
                onChangeText={setCreditNoteReason}
                placeholder="Adjustment reason"
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setIsCreditNoteModalOpen(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalSubmitBtn} onPress={handleCreateCreditNote}>
                <Text style={styles.modalSubmitText}>Issue Credit Note</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: REVERSE JOURNAL ENTRY */}
      <Modal visible={isReverseJournalModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Reverse General Ledger Entry</Text>
            <Text style={styles.modalSub}>
              Reverse journal {reverseJournalEntry?.entryNumber}. Per double-entry standards, the original journal is preserved immutably and an exact offsetting reversal entry is posted.
            </Text>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.formLabel}>Journal Entry</Text>
              <View style={styles.disabledInputBox}>
                <Text style={styles.disabledInputText}>{reverseJournalEntry?.entryNumber} — {reverseJournalEntry?.memo}</Text>
              </View>

              <Text style={styles.formLabel}>Reversal Reason / Audit Justification</Text>
              <TextInput
                style={styles.input}
                value={reverseReason}
                onChangeText={setReverseReason}
                placeholder="Reason for reversing entry"
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setIsReverseJournalModalOpen(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalSubmitBtn, { backgroundColor: colors.live }]} onPress={handleReverseJournal}>
                <Text style={styles.modalSubmitText}>Post Reversal Entry</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: PRINTABLE INVOICE DOCUMENT */}
      <Modal visible={isPrintInvoiceModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, styles.documentModalContainer]}>
            <View style={styles.docActionsTop}>
              <Pressable style={styles.printActionBtn} onPress={handlePrintDocument}>
                <Text style={styles.printActionBtnText}>🖨️ Print / Save PDF</Text>
              </Pressable>
              <Pressable style={styles.docCloseBtn} onPress={() => setIsPrintInvoiceModalOpen(false)}>
                <Text style={styles.docCloseBtnText}>✕ Close</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.documentSheet} showsVerticalScrollIndicator={false}>
              {isOwnerPreview && (
                <View style={{ backgroundColor: "#FEF3C7", padding: spacing.sm, borderRadius: radius.sm, marginBottom: spacing.md }}>
                  <Text style={{ fontSize: 11, fontWeight: "800", color: "#92400E", textAlign: "center" }}>
                    SAMPLE PREVIEW DOCUMENT — NOT A VALID COMMERCIAL TAX INVOICE
                  </Text>
                </View>
              )}
              {/* Document Header */}
              <View style={styles.docHeader}>
                <View>
                  <Text style={styles.docOrgName}>HealthTimes Zimbabwe</Text>
                  <Text style={styles.docOrgSub}>National Health & Science Newsroom OS</Text>
                  <Text style={styles.docOrgAddress}>Harare, Zimbabwe · info@healthtimes.co.zw</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.docTypeTitle}>TAX INVOICE</Text>
                  <Text style={styles.docNumber}>{printInvoiceItem?.invoiceNumber}</Text>
                  <View style={[styles.badge, getStatusBadgeStyle(printInvoiceItem?.effectiveStatus ?? "draft"), { marginTop: 4 }]}>
                    <Text style={styles.badgeText}>{(printInvoiceItem?.effectiveStatus ?? "draft").toUpperCase()}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.docDivider} />

              {/* Billed To / Dates Meta */}
              <View style={styles.docMetaRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.docMetaHeading}>BILLED TO:</Text>
                  <Text style={styles.docCustomerName}>{printInvoiceItem?.customerName}</Text>
                  <Text style={styles.docCustomerSub}>Corporate Advertiser Account</Text>
                  <Text style={styles.docCustomerSub}>Currency: {printInvoiceItem?.currency ?? "USD"}</Text>
                </View>
                <View style={{ width: 200, alignItems: "flex-end" }}>
                  <Text style={styles.docMetaText}><Text style={styles.docMetaBold}>Issue Date: </Text>{printInvoiceItem?.issueDate ?? printInvoiceItem?.createdAt.slice(0, 10)}</Text>
                  <Text style={styles.docMetaText}><Text style={styles.docMetaBold}>Due Date: </Text>{printInvoiceItem?.dueDate ?? "Upon Receipt"}</Text>
                  <Text style={styles.docMetaText}><Text style={styles.docMetaBold}>Terms: </Text>{printInvoiceItem?.paymentTermsDays ?? 30} Days</Text>
                </View>
              </View>

              {/* Line Items Table */}
              <View style={[styles.table, { marginTop: spacing.md }]}>
                <View style={styles.docTableHeader}>
                  <Text style={[styles.th, { width: 40 }]}>#</Text>
                  <Text style={[styles.th, { flex: 1 }]}>DESCRIPTION / PLACEMENT</Text>
                  <Text style={[styles.th, { width: 70, textAlign: "right" }]}>QTY</Text>
                  <Text style={[styles.th, { width: 100, textAlign: "right" }]}>UNIT PRICE</Text>
                  <Text style={[styles.th, { width: 80, textAlign: "right" }]}>TAX</Text>
                  <Text style={[styles.th, { width: 110, textAlign: "right" }]}>AMOUNT</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={[styles.td, { width: 40 }]}>1</Text>
                  <Text style={[styles.td, { flex: 1, fontWeight: "600" }]}>
                    {printInvoiceItem?.notes ? printInvoiceItem.notes : "Digital Banner Placement & Editorial Campaign"}
                  </Text>
                  <Text style={[styles.td, { width: 70, textAlign: "right" }]}>1</Text>
                  <Text style={[styles.td, { width: 100, textAlign: "right" }]}>
                    {printInvoiceItem?.currency} {(printInvoiceItem?.subtotal ?? 0).toFixed(2)}
                  </Text>
                  <Text style={[styles.td, { width: 80, textAlign: "right" }]}>15%</Text>
                  <Text style={[styles.td, { width: 110, textAlign: "right", fontWeight: "700" }]}>
                    {printInvoiceItem?.currency} {(printInvoiceItem?.total ?? 0).toFixed(2)}
                  </Text>
                </View>
              </View>

              {/* Totals Summary */}
              <View style={styles.docTotalsSection}>
                <View style={styles.docRemittanceBox}>
                  <Text style={styles.docRemitTitle}>REMITTANCE INSTRUCTIONS</Text>
                  <Text style={styles.docRemitText}>Bank: Stanbic Bank Zimbabwe</Text>
                  <Text style={styles.docRemitText}>Account: 9140003482910</Text>
                  <Text style={styles.docRemitText}>Swift: SBICZWHX</Text>
                  <Text style={styles.docRemitText}>Reference: {printInvoiceItem?.invoiceNumber}</Text>
                </View>
                <View style={styles.docTotalsBox}>
                  <View style={styles.docTotalRow}>
                    <Text style={styles.docTotalLabel}>Subtotal:</Text>
                    <Text style={styles.docTotalVal}>{printInvoiceItem?.currency} {(printInvoiceItem?.subtotal ?? 0).toFixed(2)}</Text>
                  </View>
                  <View style={styles.docTotalRow}>
                    <Text style={styles.docTotalLabel}>VAT (15%):</Text>
                    <Text style={styles.docTotalVal}>{printInvoiceItem?.currency} {(printInvoiceItem?.taxTotal ?? 0).toFixed(2)}</Text>
                  </View>
                  <View style={[styles.docTotalRow, styles.docTotalRowGrand]}>
                    <Text style={styles.docGrandLabel}>TOTAL DUE:</Text>
                    <Text style={styles.docGrandVal}>{printInvoiceItem?.currency} {(printInvoiceItem?.total ?? 0).toFixed(2)}</Text>
                  </View>
                  <View style={styles.docTotalRow}>
                    <Text style={styles.docTotalLabel}>Amount Paid:</Text>
                    <Text style={[styles.docTotalVal, { color: colors.success }]}>
                      {printInvoiceItem?.currency} {(printInvoiceItem?.amountPaid ?? 0).toFixed(2)}
                    </Text>
                  </View>
                  <View style={[styles.docTotalRow, { borderTopWidth: 1, borderTopColor: "#DDDDDD", paddingTop: 4 }]}>
                    <Text style={[styles.docTotalLabel, { fontWeight: "800" }]}>Balance Due:</Text>
                    <Text style={[styles.docTotalVal, { fontWeight: "900", color: (printInvoiceItem?.balanceDue ?? 0) > 0 ? colors.live : colors.success }]}>
                      {printInvoiceItem?.currency} {(printInvoiceItem?.balanceDue ?? 0).toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={styles.docFootnote}>Thank you for supporting independent public health journalism in Zimbabwe.</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL: PRINTABLE RECEIPT */}
      <Modal visible={isPrintReceiptModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, styles.documentModalContainer]}>
            <View style={styles.docActionsTop}>
              <Pressable style={styles.printActionBtn} onPress={handlePrintDocument}>
                <Text style={styles.printActionBtnText}>🖨️ Print / Save PDF</Text>
              </Pressable>
              <Pressable style={styles.docCloseBtn} onPress={() => setIsPrintReceiptModalOpen(false)}>
                <Text style={styles.docCloseBtnText}>✕ Close</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.documentSheet} showsVerticalScrollIndicator={false}>
              {isOwnerPreview && (
                <View style={{ backgroundColor: "#FEF3C7", padding: spacing.sm, borderRadius: radius.sm, marginBottom: spacing.md }}>
                  <Text style={{ fontSize: 11, fontWeight: "800", color: "#92400E", textAlign: "center" }}>
                    SAMPLE PREVIEW RECEIPT — SIMULATED SETTLEMENT RECORD ONLY
                  </Text>
                </View>
              )}
              <View style={styles.docHeader}>
                <View>
                  <Text style={styles.docOrgName}>HealthTimes Zimbabwe</Text>
                  <Text style={styles.docOrgSub}>Official Payment Receipt</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.docTypeTitle}>CASH RECEIPT</Text>
                  <Text style={styles.docNumber}>{printPaymentItem?.paymentNumber}</Text>
                  <View style={[styles.badge, styles.badgeSuccess, { marginTop: 4 }]}>
                    <Text style={styles.badgeText}>VERIFIED PAYMENT</Text>
                  </View>
                </View>
              </View>

              <View style={styles.docDivider} />

              <View style={{ gap: spacing.md, marginVertical: spacing.md }}>
                <View style={styles.docReceiptRow}>
                  <Text style={styles.docReceiptLabel}>Received From:</Text>
                  <Text style={styles.docReceiptVal}>{printPaymentItem?.customerName}</Text>
                </View>
                <View style={styles.docReceiptRow}>
                  <Text style={styles.docReceiptLabel}>Applied to Invoice:</Text>
                  <Text style={[styles.docReceiptVal, styles.codeText]}>{printPaymentItem?.invoiceNumber}</Text>
                </View>
                <View style={styles.docReceiptRow}>
                  <Text style={styles.docReceiptLabel}>Payment Date:</Text>
                  <Text style={styles.docReceiptVal}>{printPaymentItem?.paymentDate}</Text>
                </View>
                <View style={styles.docReceiptRow}>
                  <Text style={styles.docReceiptLabel}>Payment Method:</Text>
                  <Text style={styles.docReceiptVal}>{printPaymentItem?.paymentMethod.replace("_", " ").toUpperCase()}</Text>
                </View>
                <View style={styles.docReceiptRow}>
                  <Text style={styles.docReceiptLabel}>External Reference:</Text>
                  <Text style={[styles.docReceiptVal, styles.codeText]}>{printPaymentItem?.reference ?? "Direct settlement"}</Text>
                </View>
                <View style={styles.docReceiptRow}>
                  <Text style={styles.docReceiptLabel}>Recorded By:</Text>
                  <Text style={styles.docReceiptVal}>{printPaymentItem?.recordedByName ?? "Staff Member"}</Text>
                </View>
              </View>

              <View style={styles.docReceiptAmountBox}>
                <Text style={styles.docReceiptAmountLabel}>AMOUNT RECEIVED</Text>
                <Text style={styles.docReceiptAmountVal}>
                  {printPaymentItem?.currency} {(printPaymentItem?.amount ?? 0).toFixed(2)}
                </Text>
              </View>

              <Text style={styles.docFootnote}>This document serves as authoritative proof of settlement. Recorded in Newsroom General Ledger.</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL: CUSTOMER STATEMENT */}
      <Modal visible={isStatementModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, styles.documentModalContainer]}>
            <View style={styles.docActionsTop}>
              <Pressable style={styles.printActionBtn} onPress={handlePrintDocument}>
                <Text style={styles.printActionBtnText}>🖨️ Print / Save PDF</Text>
              </Pressable>
              <Pressable style={styles.docCloseBtn} onPress={() => setIsStatementModalOpen(false)}>
                <Text style={styles.docCloseBtnText}>✕ Close</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.documentSheet} showsVerticalScrollIndicator={false}>
              {isOwnerPreview && (
                <View style={{ backgroundColor: "#FEF3C7", padding: spacing.sm, borderRadius: radius.sm, marginBottom: spacing.md }}>
                  <Text style={{ fontSize: 11, fontWeight: "800", color: "#92400E", textAlign: "center" }}>
                    SAMPLE PREVIEW STATEMENT OF ACCOUNT — FOR INTERFACE REVIEW ONLY
                  </Text>
                </View>
              )}
              <View style={styles.docHeader}>
                <View>
                  <Text style={styles.docOrgName}>HealthTimes Zimbabwe</Text>
                  <Text style={styles.docOrgSub}>Commercial Finance & Accounting</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.docTypeTitle}>STATEMENT OF ACCOUNT</Text>
                  <Text style={styles.docCustomerName}>{statementCustomer?.name}</Text>
                </View>
              </View>

              <View style={styles.docDivider} />

              {statementLoading ? (
                <ActivityIndicator size="large" color={colors.blue} style={{ padding: spacing.xxl }} />
              ) : (
                <>
                  {/* Summary Bar */}
                  <View style={styles.statementSummaryStrip}>
                    <View style={styles.statementStat}>
                      <Text style={styles.statementStatLabel}>OPENING</Text>
                      <Text style={styles.statementStatVal}>
                        {customerStatementData?.currency ?? "USD"} {(customerStatementData?.openingBalance ?? 0).toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.statementStat}>
                      <Text style={styles.statementStatLabel}>INVOICED</Text>
                      <Text style={styles.statementStatVal}>
                        {customerStatementData?.currency ?? "USD"} {(customerStatementData?.totalInvoiced ?? 0).toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.statementStat}>
                      <Text style={styles.statementStatLabel}>PAID</Text>
                      <Text style={[styles.statementStatVal, { color: colors.success }]}>
                        {customerStatementData?.currency ?? "USD"} {(customerStatementData?.totalPaid ?? 0).toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.statementStat}>
                      <Text style={styles.statementStatLabel}>CREDITS</Text>
                      <Text style={styles.statementStatVal}>
                        {customerStatementData?.currency ?? "USD"} {(customerStatementData?.totalCredits ?? 0).toFixed(2)}
                      </Text>
                    </View>
                    <View style={[styles.statementStat, { borderRightWidth: 0 }]}>
                      <Text style={styles.statementStatLabel}>CLOSING DUE</Text>
                      <Text style={[styles.statementStatVal, (customerStatementData?.closingBalance ?? 0) > 0 ? styles.textDanger : styles.textSuccess]}>
                        {customerStatementData?.currency ?? "USD"} {(customerStatementData?.closingBalance ?? 0).toFixed(2)}
                      </Text>
                    </View>
                  </View>

                  {/* Activity Ledger Table */}
                  <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>Chronological Account Activity</Text>
                  <View style={styles.table}>
                    <View style={styles.docTableHeader}>
                      <Text style={[styles.th, { width: 100 }]}>DATE</Text>
                      <Text style={[styles.th, { width: 80 }]}>TYPE</Text>
                      <Text style={[styles.th, { width: 130 }]}>REFERENCE</Text>
                      <Text style={[styles.th, { flex: 1 }]}>MEMO / DESCRIPTION</Text>
                      <Text style={[styles.th, { width: 120, textAlign: "right" }]}>AMOUNT</Text>
                    </View>
                    {(customerStatementData?.activity ?? []).map((act, idx) => (
                      <View key={act.reference + idx} style={styles.tableRow}>
                        <Text style={[styles.td, { width: 100 }]}>{act.activityDate}</Text>
                        <Text style={[styles.td, { width: 80, textTransform: "uppercase", fontSize: 10, fontWeight: "700" }]}>
                          {act.type.replace("_", " ")}
                        </Text>
                        <Text style={[styles.td, styles.codeText, { width: 130 }]}>{act.reference}</Text>
                        <Text style={[styles.td, { flex: 1 }]} numberOfLines={1}>{act.memo}</Text>
                        <Text
                          style={[
                            styles.td,
                            { width: 120, textAlign: "right", fontWeight: "700" },
                            act.type === "payment" || act.type === "credit_note" ? { color: colors.success } : {}
                          ]}
                        >
                          {act.type === "payment" || act.type === "credit_note" ? `-${act.amount.toFixed(2)}` : act.amount.toFixed(2)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function getStatusBadgeStyle(status: string) {
  switch (status) {
    case "paid":
    case "completed":
    case "billed":
      return { backgroundColor: "#E6F4EA" };
    case "partially_paid":
    case "partially_billed":
      return { backgroundColor: "#FEF7E0" };
    case "overdue":
    case "rejected":
    case "void":
      return { backgroundColor: "#FCE8E6" };
    case "issued":
    case "approved":
      return { backgroundColor: "#E8F0FE" };
    default:
      return { backgroundColor: "#F1F3F4" };
  }
}

function getExpenseBadgeStyle(status: string) {
  switch (status) {
    case "paid":
      return { backgroundColor: "#E6F4EA" };
    case "approved":
      return { backgroundColor: "#E8F0FE" };
    case "rejected":
      return { backgroundColor: "#FCE8E6" };
    case "submitted":
      return { backgroundColor: "#FEF7E0" };
    default:
      return { backgroundColor: "#F1F3F4" };
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: spacing.sm
  },
  bannerSuccess: {
    backgroundColor: "#E6F4EA",
    borderColor: "#137333",
    borderWidth: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md
  },
  bannerSuccessText: {
    color: "#137333",
    fontWeight: "700",
    fontSize: 13
  },
  bannerError: {
    backgroundColor: "#FCE8E6",
    borderColor: "#C5221F",
    borderWidth: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md
  },
  bannerErrorText: {
    color: "#C5221F",
    fontWeight: "700",
    fontSize: 13
  },
  kpiStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginBottom: spacing.lg
  },
  kpiCard: {
    flex: 1,
    minWidth: 180,
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md
  },
  kpiCardAlert: {
    borderColor: "#FAD2CF",
    backgroundColor: "#FFF8F7"
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: colors.inkMuted,
    marginBottom: 4
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: "900",
    color: colors.ink,
    marginBottom: 2
  },
  kpiSub: {
    fontSize: 11,
    color: colors.inkMuted
  },
  tabsRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.md
  },
  tabsContent: {
    flexDirection: "row",
    gap: spacing.xs
  },
  tabBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: "transparent"
  },
  tabBtnActive: {
    borderBottomColor: colors.blue
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.inkMuted
  },
  tabBtnTextActive: {
    color: colors.blue,
    fontWeight: "800"
  },
  tabContent: {
    gap: spacing.md
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.ink
  },
  sectionSub: {
    fontSize: 13,
    color: colors.inkMuted,
    lineHeight: 18
  },
  detailSummaryCard: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.sm,
    marginTop: spacing.md,
    maxWidth: "100%"
  },
  detailSummaryText: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 20
  },
  currencyToggle: {
    flexDirection: "row",
    gap: 4
  },
  currBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border
  },
  currBtnActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink
  },
  currBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.inkMuted
  },
  currBtnTextActive: {
    color: "#FFFFFF"
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  summaryCard: {
    flex: 1,
    minWidth: 260,
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm
  },
  summaryCardTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.ink,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 6
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  metricLabel: {
    fontSize: 12,
    color: colors.inkMuted
  },
  metricValue: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink
  },
  quickActionsBar: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md
  },
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.md
  },
  filterGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  filterChip: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#F1F3F4"
  },
  filterChipActive: {
    backgroundColor: colors.blue
  },
  filterChipText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    color: colors.inkMuted
  },
  filterChipTextActive: {
    color: "#FFFFFF"
  },
  actionBtnPrimary: {
    backgroundColor: colors.blue,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.md
  },
  actionBtnPrimaryText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800"
  },
  actionBtnSecondary: {
    backgroundColor: "#F1F3F4",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border
  },
  actionBtnSecondaryText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "700"
  },
  emptyState: {
    padding: spacing.xxl,
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    gap: spacing.xs
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.ink
  },
  emptySub: {
    fontSize: 13,
    color: colors.inkMuted
  },
  tableScroll: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border
  },
  table: {
    minWidth: 700
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F8F9FA",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md
  },
  th: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.inkMuted,
    letterSpacing: 0.6
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md
  },
  td: {
    fontSize: 12,
    color: colors.ink
  },
  tdCell: {
    justifyContent: "center"
  },
  codeText: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontWeight: "700"
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
    color: colors.ink
  },
  rowActions: {
    flexDirection: "row",
    gap: 6
  },
  miniBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#F8F9FA"
  },
  miniBtnText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.ink
  },
  miniBtnPrimary: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.blue
  },
  miniBtnPrimaryText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFF"
  },
  miniBtnSuccess: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: "#137333"
  },
  miniBtnSuccessText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFF"
  },
  miniBtnDanger: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: "#FCE8E6"
  },
  miniBtnDangerText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#C5221F"
  },
  agingTotalsRow: {
    gap: spacing.md,
    marginTop: spacing.md
  },
  agingTotalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md
  },
  agingCurrencyTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.ink,
    marginBottom: spacing.sm
  },
  agingBucketsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  agingBucket: {
    flex: 1,
    minWidth: 110,
    padding: spacing.sm,
    borderRadius: radius.sm,
    alignItems: "center"
  },
  agingBucketLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.6,
    color: colors.inkMuted,
    marginBottom: 4
  },
  agingBucketVal: {
    fontSize: 14,
    fontWeight: "900"
  },
  agingTotalFoot: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.ink,
    marginTop: spacing.sm,
    textAlign: "right"
  },
  glNoticeBox: {
    backgroundColor: "#E8F0FE",
    borderColor: "#1A73E8",
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4
  },
  glNoticeTitle: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
    color: "#1A73E8"
  },
  glNoticeBody: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.ink
  },
  glNoticeSub: {
    fontSize: 11,
    color: colors.inkMuted
  },
  governanceNoticeBox: {
    backgroundColor: "#F0FDF4",
    borderColor: "#16A34A",
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: 4
  },
  governanceNoticeTitle: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
    color: "#15803D"
  },
  governanceNoticeText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#166534"
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.md
  },
  modalContainer: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: "#FFFFFF",
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.sm,
    maxHeight: "90%"
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.ink
  },
  modalSub: {
    fontSize: 12,
    color: colors.inkMuted,
    marginBottom: spacing.sm
  },
  modalForm: {
    gap: spacing.sm
  },
  formLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.inkMuted,
    marginTop: spacing.xs
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: 13,
    color: colors.ink,
    backgroundColor: "#FAFAFA"
  },
  formRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  formCol: {
    flex: 1
  },
  pickerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  customerPickerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    maxHeight: 100
  },
  pickerChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#F8F9FA"
  },
  pickerChipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink
  },
  pickerChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.inkMuted
  },
  pickerChipTextActive: {
    color: "#FFFFFF"
  },
  calcSummaryBox: {
    backgroundColor: "#F8F9FA",
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: spacing.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  calcLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.inkMuted
  },
  calcValue: {
    fontSize: 15,
    fontWeight: "900",
    color: colors.ink
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm
  },
  modalCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.sm
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.inkMuted
  },
  modalSubmitBtn: {
    backgroundColor: colors.blue,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.sm
  },
  modalSubmitText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF"
  },
  glBanner: {
    backgroundColor: "#132332",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#203A4E",
    padding: spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md
  },
  glBannerLeft: {
    gap: 4
  },
  glBannerEyebrow: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
    color: "#70D1D1"
  },
  glBannerTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFFFFF"
  },
  glBannerSub: {
    fontSize: 12,
    color: "#9FB3C8"
  },
  balanceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1
  },
  balanceBadgeOk: {
    backgroundColor: "#064E3B",
    borderColor: "#10B981"
  },
  balanceBadgeWarn: {
    backgroundColor: "#7F1D1D",
    borderColor: "#EF4444"
  },
  balanceBadgeText: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.6
  },
  balanceBadgeTextOk: {
    color: "#6EE7B7"
  },
  balanceBadgeTextWarn: {
    color: "#FCA5A5"
  },
  surplusBox: {
    alignItems: "flex-end",
    backgroundColor: "#0D1821",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "#203A4E"
  },
  surplusLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#9FB3C8",
    letterSpacing: 0.8
  },
  surplusValue: {
    fontSize: 18,
    fontWeight: "900"
  },
  textSuccess: {
    color: "#10B981"
  },
  textDanger: {
    color: "#EF4444"
  },
  totalsRow: {
    backgroundColor: "#F1F5F9",
    borderTopWidth: 2,
    borderTopColor: colors.ink
  },
  subtotalRow: {
    backgroundColor: "#F8FAFC",
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  netOperatingLine: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: "#132332",
    borderRadius: radius.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  netOperatingLineTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.8
  },
  netOperatingLineVal: {
    fontSize: 18,
    fontWeight: "900"
  },
  journalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md
  },
  journalCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  journalCardNum: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.ink,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace"
  },
  journalCardDate: {
    fontSize: 11,
    color: colors.inkMuted
  },
  journalCardMemo: {
    fontSize: 13,
    color: colors.ink,
    marginTop: 4,
    fontWeight: "500"
  },
  badgeSuccess: {
    backgroundColor: "#DCFCE7"
  },
  badgeMuted: {
    backgroundColor: "#F1F5F9"
  },
  disabledInputBox: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.sm
  },
  disabledInputText: {
    fontSize: 12,
    color: colors.ink,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace"
  },
  documentModalContainer: {
    maxWidth: 720,
    backgroundColor: "#F8FAFC"
  },
  docActionsTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs
  },
  printActionBtn: {
    backgroundColor: colors.blue,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.sm
  },
  printActionBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 12
  },
  docCloseBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  docCloseBtnText: {
    color: colors.inkMuted,
    fontWeight: "700",
    fontSize: 12
  },
  documentSheet: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl
  },
  docHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start"
  },
  docOrgName: {
    fontSize: 18,
    fontWeight: "900",
    color: "#132332"
  },
  docOrgSub: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.blue
  },
  docOrgAddress: {
    fontSize: 10,
    color: colors.inkMuted,
    marginTop: 2
  },
  docTypeTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#132332",
    letterSpacing: 1
  },
  docNumber: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.ink,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace"
  },
  docDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md
  },
  docMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  docMetaHeading: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: colors.inkMuted
  },
  docCustomerName: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.ink,
    marginTop: 2
  },
  docCustomerSub: {
    fontSize: 11,
    color: colors.inkMuted
  },
  docMetaText: {
    fontSize: 11,
    color: colors.ink,
    lineHeight: 18
  },
  docMetaBold: {
    fontWeight: "700",
    color: colors.inkMuted
  },
  docTableHeader: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm
  },
  docTotalsSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  docRemittanceBox: {
    flex: 1,
    paddingRight: spacing.lg
  },
  docRemitTitle: {
    fontSize: 10,
    fontWeight: "900",
    color: colors.inkMuted,
    letterSpacing: 0.8,
    marginBottom: 4
  },
  docRemitText: {
    fontSize: 11,
    color: colors.ink,
    lineHeight: 16
  },
  docTotalsBox: {
    width: 240,
    gap: 4
  },
  docTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  docTotalLabel: {
    fontSize: 11,
    color: colors.inkMuted
  },
  docTotalVal: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink
  },
  docTotalRowGrand: {
    borderTopWidth: 2,
    borderTopColor: colors.ink,
    paddingTop: 4,
    marginTop: 4
  },
  docGrandLabel: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.ink
  },
  docGrandVal: {
    fontSize: 15,
    fontWeight: "900",
    color: colors.ink
  },
  docFootnote: {
    fontSize: 10,
    color: colors.inkMuted,
    textAlign: "center",
    marginTop: spacing.xl,
    fontStyle: "italic"
  },
  docReceiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9"
  },
  docReceiptLabel: {
    fontSize: 12,
    color: colors.inkMuted,
    fontWeight: "600"
  },
  docReceiptVal: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink
  },
  docReceiptAmountBox: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#86EFAC",
    borderRadius: radius.sm,
    padding: spacing.md,
    alignItems: "center",
    marginTop: spacing.md
  },
  docReceiptAmountLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    color: "#166534"
  },
  docReceiptAmountVal: {
    fontSize: 24,
    fontWeight: "900",
    color: "#166534",
    marginTop: 2
  },
  statementSummaryStrip: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    marginVertical: spacing.md
  },
  statementStat: {
    flex: 1,
    padding: spacing.sm,
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: colors.border
  },
  statementStatLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.6,
    color: colors.inkMuted
  },
  statementStatVal: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.ink,
    marginTop: 2
  }
});
