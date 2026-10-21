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
  NewsroomFinanceStatements
} from "../domain/models";

export type FinanceTab =
  | "overview"
  | "invoices"
  | "aging"
  | "payments"
  | "expenses"
  | "statements"
  | "customers";

interface StudioFinanceDeskProps {
  initialTab?: FinanceTab;
  isOwnerPreview?: boolean;
  previewOverview?: NewsroomFinanceOverview;
  previewStatements?: NewsroomFinanceStatements;
  previewAging?: NewsroomReceivablesAging;
  previewInvoices?: NewsroomInvoiceItem[];
  previewPayments?: NewsroomPaymentItem[];
  previewExpenses?: NewsroomExpenseItem[];
  previewOrders?: NewsroomCommercialOrder[];
  previewCustomers?: NewsroomCustomer[];
}

export function StudioFinanceDeskView({
  initialTab = "overview",
  isOwnerPreview = false,
  previewOverview,
  previewStatements,
  previewAging,
  previewInvoices = [],
  previewPayments = [],
  previewExpenses = [],
  previewOrders = [],
  previewCustomers = []
}: StudioFinanceDeskProps) {
  const [activeTab, setActiveTab] = useState<FinanceTab>(initialTab);
  const [currencyFilter, setCurrencyFilter] = useState<string>("USD");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>("all");
  const [expenseScope, setExpenseScope] = useState<"all" | "my">("all");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modals
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<NewsroomInvoiceItem | null>(null);

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

  const overviewData = isOwnerPreview ? previewOverview : liveOverview.data;
  const invoicesData = isOwnerPreview ? previewInvoices : liveInvoices.data ?? [];
  const agingData = isOwnerPreview ? previewAging : liveAging.data;
  const paymentsData = isOwnerPreview ? previewPayments : livePayments.data ?? [];
  const expensesData = isOwnerPreview ? previewExpenses : liveExpenses.data ?? [];
  const statementsData = isOwnerPreview ? previewStatements : liveStatements.data;
  const customersData = isOwnerPreview ? previewCustomers : liveCustomers.data ?? [];
  const ordersData = isOwnerPreview ? previewOrders : liveOrders.data ?? [];

  // Form States for Modals
  const [newInvCustomerId, setNewInvCustomerId] = useState<string>("");
  const [newInvDesc, setNewInvDesc] = useState<string>("Direct Advertising placement");
  const [newInvPlacement, setNewInvPlacement] = useState<string>("masthead");
  const [newInvQty, setNewInvQty] = useState<string>("1");
  const [newInvUnitPrice, setNewInvUnitPrice] = useState<string>("500.00");
  const [newInvTaxRate, setNewInvTaxRate] = useState<string>("0.15");
  const [newInvCurrency, setNewInvCurrency] = useState<string>("USD");

  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("bank_transfer");
  const [paymentRef, setPaymentRef] = useState<string>("");

  const [expVendor, setExpVendor] = useState<string>("");
  const [expCategory, setExpCategory] = useState<string>("travel");
  const [expDesc, setExpDesc] = useState<string>("");
  const [expAmount, setExpAmount] = useState<string>("");
  const [expCurrency, setExpCurrency] = useState<string>("USD");
  const [expDept, setExpDept] = useState<string>("Editorial");

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
      notify("Owner Preview: Invoice approved (read-only presentation simulated).");
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
      notify("Owner Preview: Invoice issued (read-only presentation simulated).");
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
      notify("Owner Preview: Invoice voided (read-only presentation simulated).");
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
    if (isOwnerPreview) {
      notify("Owner Preview: Invoice creation simulated (writes disabled).");
      setIsInvoiceModalOpen(false);
      return;
    }
    try {
      if (!newInvCustomerId) throw new Error("Please select a customer");
      const qty = parseFloat(newInvQty) || 1;
      const price = parseFloat(newInvUnitPrice) || 0;
      const taxRate = parseFloat(newInvTaxRate) || 0;
      await services.newsroomFinance.createInvoice({
        customerId: newInvCustomerId,
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
      setRefreshKey((k) => k + 1);
    } catch (e) {
      notifyError(e);
    }
  }

  async function handleRecordPayment() {
    if (!selectedInvoice) return;
    if (isOwnerPreview) {
      notify("Owner Preview: Payment recorded (read-only presentation simulated).");
      setIsPaymentModalOpen(false);
      return;
    }
    try {
      const amt = parseFloat(paymentAmount);
      if (!amt || amt <= 0) throw new Error("Enter a valid payment amount");
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
      notify("Owner Preview: Expense claim submitted (writes disabled).");
      setIsExpenseModalOpen(false);
      return;
    }
    try {
      const amt = parseFloat(expAmount);
      if (!amt || amt <= 0) throw new Error("Enter a valid expense amount");
      if (!expVendor) throw new Error("Vendor name is required");
      if (!expDesc) throw new Error("Expense description is required");

      await services.newsroomFinance.createExpense({
        vendorName: expVendor,
        category: expCategory,
        description: expDesc,
        department: expDept,
        amount: amt,
        currency: expCurrency,
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
      notify("Owner Preview: Expense approved.");
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
      notify("Owner Preview: Expense paid.");
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
            style={[styles.tabBtn, activeTab === "statements" && styles.tabBtnActive]}
            onPress={() => setActiveTab("statements")}
          >
            <Text style={[styles.tabBtnText, activeTab === "statements" && styles.tabBtnTextActive]}>Statements</Text>
          </Pressable>

          <Pressable
            style={[styles.tabBtn, activeTab === "customers" && styles.tabBtnActive]}
            onPress={() => setActiveTab("customers")}
          >
            <Text style={[styles.tabBtnText, activeTab === "customers" && styles.tabBtnTextActive]}>
              Orders & Customers ({ordersData.length})
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
            <Pressable style={styles.actionBtnPrimary} onPress={() => setIsInvoiceModalOpen(true)}>
              <Text style={styles.actionBtnPrimaryText}>+ Create Invoice</Text>
            </Pressable>
            <Pressable style={styles.actionBtnSecondary} onPress={() => setIsExpenseModalOpen(true)}>
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
            <Pressable style={styles.actionBtnPrimary} onPress={() => setIsInvoiceModalOpen(true)}>
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
                  <Text style={[styles.th, { width: 220 }]}>ACTIONS</Text>
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
                    <View style={[styles.tdCell, styles.rowActions, { width: 220 }]}>
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
          <View style={styles.toolbar}>
            <View style={styles.filterGroup}>
              <Pressable
                style={[styles.filterChip, expenseScope === "all" && styles.filterChipActive]}
                onPress={() => setExpenseScope("all")}
              >
                <Text style={[styles.filterChipText, expenseScope === "all" && styles.filterChipTextActive]}>
                  ALL NEWSROOM CLAIMS
                </Text>
              </Pressable>
              <Pressable
                style={[styles.filterChip, expenseScope === "my" && styles.filterChipActive]}
                onPress={() => setExpenseScope("my")}
              >
                <Text style={[styles.filterChipText, expenseScope === "my" && styles.filterChipTextActive]}>
                  MY EXPENSE CLAIMS
                </Text>
              </Pressable>
            </View>
            <Pressable style={styles.actionBtnPrimary} onPress={() => setIsExpenseModalOpen(true)}>
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
                  <Text style={[styles.th, { width: 200 }]}>DESCRIPTION</Text>
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
                    <Text style={[styles.td, { width: 200 }]} numberOfLines={1}>{e.description}</Text>
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

      {/* 7. ORDERS & CUSTOMERS TAB */}
      {activeTab === "customers" && (
        <View style={styles.tabContent}>
          <Text style={styles.sectionTitle}>Commercial Orders & Booking Contracts</Text>
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
                  </View>
                ))}
              </View>
            </ScrollView>
          )}

          <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Billing Customers & Accounts</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { width: 220 }]}>NAME</Text>
              <Text style={[styles.th, { width: 200 }]}>BILLING EMAIL</Text>
              <Text style={[styles.th, { width: 90 }]}>CURR</Text>
              <Text style={[styles.th, { width: 100 }]}>TERMS</Text>
              <Text style={[styles.th, { width: 120 }]}>TAX #</Text>
            </View>
            {customersData.map((cust) => (
              <View key={cust.id} style={styles.tableRow}>
                <Text style={[styles.td, { width: 220, fontWeight: "600" }]}>{cust.name}</Text>
                <Text style={[styles.td, { width: 200 }]}>{cust.billingEmail}</Text>
                <Text style={[styles.td, { width: 90 }]}>{cust.currency}</Text>
                <Text style={[styles.td, { width: 100 }]}>{cust.paymentTermsDays} days</Text>
                <Text style={[styles.td, { width: 120 }]}>{cust.taxNumber ?? "—"}</Text>
              </View>
            ))}
          </View>
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
                />
              )}

              <Text style={styles.formLabel}>Description</Text>
              <TextInput style={styles.input} value={newInvDesc} onChangeText={setNewInvDesc} />

              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.formLabel}>Placement</Text>
                  <TextInput style={styles.input} value={newInvPlacement} onChangeText={setNewInvPlacement} />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.formLabel}>Currency</Text>
                  <TextInput style={styles.input} value={newInvCurrency} onChangeText={setNewInvCurrency} />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.formLabel}>Quantity</Text>
                  <TextInput style={styles.input} value={newInvQty} onChangeText={setNewInvQty} keyboardType="numeric" />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.formLabel}>Unit Price ({newInvCurrency})</Text>
                  <TextInput style={styles.input} value={newInvUnitPrice} onChangeText={setNewInvUnitPrice} keyboardType="numeric" />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.formLabel}>Tax Rate (0.15 = 15%)</Text>
                  <TextInput style={styles.input} value={newInvTaxRate} onChangeText={setNewInvTaxRate} keyboardType="numeric" />
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
              <Pressable style={styles.modalCancelBtn} onPress={() => setIsInvoiceModalOpen(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalSubmitBtn} onPress={handleCreateInvoice}>
                <Text style={styles.modalSubmitText}>Save Draft Invoice</Text>
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
              />

              <Text style={styles.formLabel}>Payment Method</Text>
              <View style={styles.pickerRow}>
                {["bank_transfer", "cash", "ecocash", "card"].map((m) => (
                  <Pressable
                    key={m}
                    style={[styles.pickerChip, paymentMethod === m && styles.pickerChipActive]}
                    onPress={() => setPaymentMethod(m)}
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
              />
            </View>

            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setIsPaymentModalOpen(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalSubmitBtn} onPress={handleRecordPayment}>
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
              />

              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.formLabel}>Category</Text>
                  <TextInput style={styles.input} value={expCategory} onChangeText={setExpCategory} />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.formLabel}>Department</Text>
                  <TextInput style={styles.input} value={expDept} onChangeText={setExpDept} />
                </View>
              </View>

              <Text style={styles.formLabel}>Description / Purpose</Text>
              <TextInput
                style={styles.input}
                value={expDesc}
                onChangeText={setExpDesc}
                placeholder="Field investigation trip to Mutare"
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
                  />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.formLabel}>Currency</Text>
                  <TextInput style={styles.input} value={expCurrency} onChangeText={setExpCurrency} />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setIsExpenseModalOpen(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalSubmitBtn} onPress={handleCreateExpense}>
                <Text style={styles.modalSubmitText}>Submit Claim</Text>
              </Pressable>
            </View>
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
  }
});
