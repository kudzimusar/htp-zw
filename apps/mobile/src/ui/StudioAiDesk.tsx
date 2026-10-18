import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions
} from "react-native";
import { breakpoints, colors, radius, spacing } from "../theme/tokens";
import { useAsync } from "../hooks/useAsync";
import { services } from "../services";
import {
  hasAiDeskAccess,
  canRunAiAssist,
  canManageCitations,
  emptyAuthorizationSnapshot
} from "../security/capabilities";
import type {
  NewsroomAiAssistOverview,
  NewsroomAiAssistSession,
  NewsroomAiTaskType,
  NewsroomCitationReference,
  NewsroomCitationsDirectory
} from "../domain/models";

export interface StudioAiDeskPresentationProps {
  overview: NewsroomAiAssistOverview | null;
  citationsDir: NewsroomCitationsDirectory | null;
  selectedTask: NewsroomAiTaskType;
  onSelectTask: (task: NewsroomAiTaskType) => void;
  promptText: string;
  onChangePromptText: (text: string) => void;
  contextText: string;
  onChangeContextText: (text: string) => void;
  onRunAssist: () => void;
  runningAssist: boolean;
  currentResult: NewsroomAiAssistSession | null;
  activeTab: "assistant" | "sessions" | "citations";
  onChangeTab: (tab: "assistant" | "sessions" | "citations") => void;
  citationFilter: string;
  onChangeCitationFilter: (filter: string) => void;
  citationSearch: string;
  onChangeCitationSearch: (search: string) => void;
  onOpenRecordModal: () => void;
  onUpdateCitationStatus: (citationId: string, status: string) => void;
  copiedIndex: number | null;
  onCopySuggestion: (text: string, index: number) => void;
  canExecuteAssist: boolean;
  canVerifyCitation: boolean;
  actionMessage: { text: string; type: "success" | "error" } | null;
}

export function StudioAiDeskPresentation({
  overview,
  citationsDir,
  selectedTask,
  onSelectTask,
  promptText,
  onChangePromptText,
  contextText,
  onChangeContextText,
  onRunAssist,
  runningAssist,
  currentResult,
  activeTab,
  onChangeTab,
  citationFilter,
  onChangeCitationFilter,
  citationSearch,
  onChangeCitationSearch,
  onOpenRecordModal,
  onUpdateCitationStatus,
  copiedIndex,
  onCopySuggestion,
  canExecuteAssist,
  canVerifyCitation,
  actionMessage
}: StudioAiDeskPresentationProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= breakpoints.tablet;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTextGroup}>
          <Text style={styles.mainTitle}>AI Editorial Assistant & Citations Desk</Text>
          <Text style={styles.mainSubtitle}>
            Bounded editorial research, headline drafting, fact-checking, and verified citation intelligence.
          </Text>
        </View>
      </View>

      {/* Safety Boundary Notice */}
      <View style={styles.safetyNoticeCard}>
        <View style={styles.safetyHeaderRow}>
          <View style={styles.safetyBadge}>
            <Text style={styles.safetyBadgeText}>SAFETY PRINCIPLE</Text>
          </View>
          <Text style={styles.safetyNoticeTitle}>ZERO DIRECT PUBLISHING AUTHORITY</Text>
        </View>
        <Text style={styles.safetyNoticeBody}>
          {overview?.safetyPolicy?.principle ??
            "AI is restricted to reviewable suggestions and drafting assistance. Direct story publication or silent mutation is strictly prohibited."}
        </Text>
        <View style={styles.safetyPillsRow}>
          <View style={styles.rulePill}><Text style={styles.rulePillText}>✓ Human Review Required</Text></View>
          <View style={styles.rulePill}><Text style={styles.rulePillText}>✓ Zero Direct Story Write</Text></View>
          <View style={styles.rulePill}><Text style={styles.rulePillText}>✓ Audited Execution Log</Text></View>
          <View style={styles.rulePill}><Text style={styles.rulePillText}>✓ Reviewable Suggestions</Text></View>
        </View>
      </View>

      {/* Provider Status Summary */}
      <View style={styles.providerCard}>
        <View style={styles.providerInfoRow}>
          <View>
            <Text style={styles.providerLabel}>ACTIVE ASSISTANT MODEL</Text>
            <Text style={styles.providerModelText}>{overview?.providerModel ?? "HealthTimes Editorial Heuristics"}</Text>
          </View>
          <View style={[
            styles.statusPill,
            overview?.providerStatus === "active" ? styles.statusActive : styles.statusUnconfigured
          ]}>
            <Text style={[
              styles.statusText,
              overview?.providerStatus === "active" ? styles.statusTextActive : styles.statusTextUnconfigured
            ]}>
              {overview?.providerStatus ?? "provider_unconfigured"}
            </Text>
          </View>
        </View>
      </View>

      {/* Action Message Banner */}
      {actionMessage && (
        <View style={[
          styles.actionBanner,
          actionMessage.type === "success" ? styles.bannerSuccess : styles.bannerError
        ]}>
          <Text style={[
            styles.actionBannerText,
            actionMessage.type === "success" ? styles.bannerTextSuccess : styles.bannerTextError
          ]}>
            {actionMessage.text}
          </Text>
        </View>
      )}

      {/* Navigation Tabs */}
      <View style={styles.tabsContainer}>
        <Pressable
          style={[styles.tabButton, activeTab === "assistant" && styles.activeTabButton]}
          onPress={() => onChangeTab("assistant")}
        >
          <Text style={[styles.tabText, activeTab === "assistant" && styles.activeTabText]}>
            Assistant Workspace
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabButton, activeTab === "sessions" && styles.activeTabButton]}
          onPress={() => onChangeTab("sessions")}
        >
          <Text style={[styles.tabText, activeTab === "sessions" && styles.activeTabText]}>
            Session History ({overview?.metrics?.totalSessions ?? 0})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabButton, activeTab === "citations" && styles.activeTabButton]}
          onPress={() => onChangeTab("citations")}
        >
          <Text style={[styles.tabText, activeTab === "citations" && styles.activeTabText]}>
            Citations & Evidence ({citationsDir?.metrics?.totalCitations ?? 0})
          </Text>
        </Pressable>
      </View>

      {/* TAB 1: ASSISTANT WORKSPACE */}
      {activeTab === "assistant" && (
        <View style={styles.workspaceCard}>
          <Text style={styles.sectionHeader}>Select Editorial Task</Text>
          <View style={styles.taskSelectorGrid}>
            {(overview?.supportedTasks ?? []).map((t) => (
              <Pressable
                key={t.id}
                style={[styles.taskCard, selectedTask === t.id && styles.taskCardActive]}
                onPress={() => onSelectTask(t.id)}
              >
                <Text style={[styles.taskCardTitle, selectedTask === t.id && styles.taskCardTitleActive]}>
                  {t.name}
                </Text>
                <Text style={styles.taskCardDesc} numberOfLines={2}>
                  {t.description}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.fieldLabel}>Editorial Prompt / Working Headline *</Text>
            <TextInput
              style={styles.textInput}
              value={promptText}
              onChangeText={onChangePromptText}
              placeholder="e.g. Zimbabwe cholera outbreak response and provincial drug supply"
              placeholderTextColor={colors.inkMuted}
            />

            <Text style={styles.fieldLabel}>Story Context or Body Snippet (Optional)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={contextText}
              onChangeText={onChangeContextText}
              placeholder="Paste draft copy, interview transcripts, or raw notes for deeper analysis..."
              placeholderTextColor={colors.inkMuted}
              multiline
              numberOfLines={4}
            />

            <View style={styles.actionRow}>
              <Pressable
                style={[
                  styles.primaryButton,
                  (!canExecuteAssist || runningAssist) && styles.disabledButton
                ]}
                onPress={onRunAssist}
                disabled={!canExecuteAssist || runningAssist}
              >
                <Text style={styles.primaryButtonText}>
                  {runningAssist ? "Analyzing & Drafting…" : "Run Editorial Assist"}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Current Assist Results */}
          {currentResult && (
            <View style={styles.resultsCard}>
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsTitle}>Generated Suggestions</Text>
                <View style={styles.reviewPill}>
                  <Text style={styles.reviewPillText}>HUMAN REVIEW REQUIRED</Text>
                </View>
              </View>
              <Text style={styles.resultsNote}>
                Review suggestions below. Click "Copy" to insert into your story workspace or editing notes.
              </Text>

              <View style={styles.suggestionsList}>
                {currentResult.suggestions.map((s, index) => (
                  <View key={index} style={styles.suggestionItem}>
                    <View style={styles.suggestionTopRow}>
                      <View style={styles.typeBadge}>
                        <Text style={styles.typeBadgeText}>{s.type.replace(/_/g, " ").toUpperCase()}</Text>
                      </View>
                      <Pressable
                        style={[
                          styles.copyButton,
                          copiedIndex === index && styles.copyButtonActive
                        ]}
                        onPress={() => onCopySuggestion(s.text, index)}
                      >
                        <Text style={[
                          styles.copyButtonText,
                          copiedIndex === index && styles.copyButtonTextActive
                        ]}>
                          {copiedIndex === index ? "Copied!" : "Copy"}
                        </Text>
                      </Pressable>
                    </View>
                    <Text style={styles.suggestionText}>{s.text}</Text>
                    {s.rationale ? (
                      <Text style={styles.suggestionRationale}>
                        <Text style={styles.boldText}>Rationale: </Text>{s.rationale}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      {/* TAB 2: SESSION HISTORY */}
      {activeTab === "sessions" && (
        <View style={styles.sessionsContainer}>
          {(overview?.recentSessions ?? []).length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No Previous Assist Sessions</Text>
              <Text style={styles.emptySubtitle}>
                Run your first editorial task from the Assistant Workspace tab to populate history.
              </Text>
            </View>
          ) : (
            (overview?.recentSessions ?? []).map((session) => (
              <View key={session.id} style={styles.sessionCard}>
                <View style={styles.sessionTopRow}>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>{session.taskType.replace(/_/g, " ").toUpperCase()}</Text>
                  </View>
                  <Text style={styles.sessionDate}>
                    {new Date(session.createdAt).toLocaleString()}
                  </Text>
                </View>
                <Text style={styles.sessionPrompt} numberOfLines={2}>
                  <Text style={styles.boldText}>Prompt: </Text>{session.inputPrompt}
                </Text>
                <View style={styles.sessionFooter}>
                  <Text style={styles.sessionMeta}>
                    {session.suggestions.length} suggestion{session.suggestions.length === 1 ? "" : "s"} • Model: {session.provider}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {/* TAB 3: CITATIONS & EVIDENCE */}
      {activeTab === "citations" && (
        <View style={styles.citationsContainer}>
          {/* Metrics Overview */}
          <View style={[styles.metricsGrid, isDesktop ? styles.gridCols4 : styles.gridCols2]}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Total Citations</Text>
              <Text style={styles.metricValue}>{citationsDir?.metrics?.totalCitations ?? 0}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Verified Evidence</Text>
              <Text style={[styles.metricValue, { color: colors.success }]}>
                {citationsDir?.metrics?.verifiedCount ?? 0}
              </Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Pending Review</Text>
              <Text style={[styles.metricValue, { color: colors.warning }]}>
                {citationsDir?.metrics?.unverifiedCount ?? 0}
              </Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Academic / Studies</Text>
              <Text style={[styles.metricValue, { color: colors.blue }]}>
                {citationsDir?.metrics?.academicCount ?? 0}
              </Text>
            </View>
          </View>

          {/* Search & Filter Toolbar */}
          <View style={styles.toolbarCard}>
            <View style={styles.toolbarRow}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search citations, academic journals, ministry reports..."
                placeholderTextColor={colors.inkMuted}
                value={citationSearch}
                onChangeText={onChangeCitationSearch}
              />
              <Pressable style={styles.primaryButton} onPress={onOpenRecordModal}>
                <Text style={styles.primaryButtonText}>+ Record Citation</Text>
              </Pressable>
            </View>
            <View style={styles.filterPillsRow}>
              {["all", "verified", "unverified", "flagged", "rejected"].map((filter) => (
                <Pressable
                  key={filter}
                  style={[
                    styles.pill,
                    citationFilter === filter && styles.activePill
                  ]}
                  onPress={() => onChangeCitationFilter(filter)}
                >
                  <Text style={[
                    styles.pillText,
                    citationFilter === filter && styles.activePillText
                  ]}>
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Citations List */}
          {(citationsDir?.citations ?? []).length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No Citations Found</Text>
              <Text style={styles.emptySubtitle}>
                No citation references match your filter criteria. Record a new academic or institutional citation above.
              </Text>
            </View>
          ) : (
            (citationsDir?.citations ?? []).map((cit) => (
              <View key={cit.id} style={styles.citationCard}>
                <View style={styles.citationCardHeader}>
                  <View style={styles.citationTitleGroup}>
                    <Text style={styles.citationTitle}>{cit.title}</Text>
                    <Text style={styles.citationMeta}>
                      Source: {cit.sourceName} • Type: {cit.referenceType} • Region: {cit.country ?? "Global"}
                    </Text>
                  </View>
                  <View style={[
                    styles.statusPill,
                    cit.status === "verified" ? styles.statusVerified :
                    cit.status === "flagged" ? styles.statusFlagged :
                    cit.status === "rejected" ? styles.statusRejected :
                    styles.statusUnverified
                  ]}>
                    <Text style={styles.statusText}>{cit.status.toUpperCase()}</Text>
                  </View>
                </View>

                {cit.storyTitle && (
                  <View style={styles.storyLinkRow}>
                    <Text style={styles.storyLinkLabel}>Linked Story: </Text>
                    <Text style={styles.storyLinkTitle}>{cit.storyTitle}</Text>
                  </View>
                )}

                {canVerifyCitation && (
                  <View style={styles.citationActionsRow}>
                    {cit.status !== "verified" && (
                      <Pressable
                        style={[styles.smallActionBtn, styles.btnVerify]}
                        onPress={() => onUpdateCitationStatus(cit.id, "verified")}
                      >
                        <Text style={styles.btnVerifyText}>Verify</Text>
                      </Pressable>
                    )}
                    {cit.status !== "flagged" && (
                      <Pressable
                        style={[styles.smallActionBtn, styles.btnFlag]}
                        onPress={() => onUpdateCitationStatus(cit.id, "flagged")}
                      >
                        <Text style={styles.btnFlagText}>Flag</Text>
                      </Pressable>
                    )}
                    {cit.status !== "rejected" && (
                      <Pressable
                        style={[styles.smallActionBtn, styles.btnReject]}
                        onPress={() => onUpdateCitationStatus(cit.id, "rejected")}
                      >
                        <Text style={styles.btnRejectText}>Reject</Text>
                      </Pressable>
                    )}
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      )}
    </View>
  );
}

export function StudioAiDesk() {
  const authorization = useAsync(() => services.authorization.getSnapshot(), []);
  const snapshot = authorization.data ?? emptyAuthorizationSnapshot("server-policy-unavailable", "loading");

  const hasAccess = hasAiDeskAccess(snapshot);
  const canExecute = canRunAiAssist(snapshot);
  const canVerify = canManageCitations(snapshot);

  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<"assistant" | "sessions" | "citations">("assistant");
  const [selectedTask, setSelectedTask] = useState<NewsroomAiTaskType>("headline_alternatives");
  const [promptText, setPromptText] = useState("");
  const [contextText, setContextText] = useState("");
  const [runningAssist, setRunningAssist] = useState(false);
  const [currentResult, setCurrentResult] = useState<NewsroomAiAssistSession | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [citationFilter, setCitationFilter] = useState("all");
  const [citationSearch, setCitationSearch] = useState("");
  const [actionMessage, setActionMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Modal State
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [modalStoryId, setModalStoryId] = useState("");
  const [modalRefType, setModalRefType] = useState("academic");
  const [modalSourceName, setModalSourceName] = useState("");
  const [modalSourceUrl, setModalSourceUrl] = useState("");
  const [modalTitle, setModalTitle] = useState("");
  const [modalCountry, setModalCountry] = useState("Zimbabwe");
  const [savingCitation, setSavingCitation] = useState(false);

  const overviewReq = useAsync(() => services.newsroomAi.getOverview(), [refreshKey]);
  const citationsReq = useAsync(
    () =>
      services.newsroomAi.getCitationsDirectory({
        status: citationFilter === "all" ? null : citationFilter,
        search: citationSearch.trim() ? citationSearch.trim() : null
      }),
    [citationFilter, citationSearch, refreshKey]
  );

  const handleRunAssist = async () => {
    if (!promptText.trim()) {
      setActionMessage({ text: "Please enter a prompt or working headline.", type: "error" });
      return;
    }

    try {
      setRunningAssist(true);
      setActionMessage(null);
      const res = await services.newsroomAi.runAssist({
        taskType: selectedTask,
        inputPrompt: promptText.trim(),
        inputContext: contextText.trim() ? contextText.trim() : null
      });
      setCurrentResult(res);
      setActionMessage({ text: "Assist suggestions generated successfully.", type: "success" });
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      setActionMessage({ text: err.message ?? "Failed to run assist", type: "error" });
    } finally {
      setRunningAssist(false);
    }
  };

  const handleCopySuggestion = (text: string, index: number) => {
    setCopiedIndex(index);
    setActionMessage({ text: "Suggestion copied to clipboard.", type: "success" });
    setTimeout(() => setCopiedIndex(null), 3000);
  };

  const handleUpdateCitationStatus = async (citationId: string, status: string) => {
    try {
      setActionMessage(null);
      await services.newsroomAi.updateCitationStatus(citationId, status);
      setActionMessage({ text: `Citation marked as ${status}.`, type: "success" });
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      setActionMessage({ text: err.message ?? "Failed to update citation status", type: "error" });
    }
  };

  const handleSaveCitation = async () => {
    if (!modalStoryId.trim() || !modalSourceName.trim()) {
      setActionMessage({ text: "Story ID and Source Name are required.", type: "error" });
      return;
    }

    try {
      setSavingCitation(true);
      setActionMessage(null);
      await services.newsroomAi.recordCitation({
        storyId: modalStoryId.trim(),
        referenceType: modalRefType,
        sourceName: modalSourceName.trim(),
        sourceUrl: modalSourceUrl.trim() ? modalSourceUrl.trim() : undefined,
        title: modalTitle.trim() ? modalTitle.trim() : undefined,
        country: modalCountry.trim() ? modalCountry.trim() : "Zimbabwe"
      });
      setIsRecordModalOpen(false);
      setModalStoryId("");
      setModalSourceName("");
      setModalSourceUrl("");
      setModalTitle("");
      setActionMessage({ text: "Citation reference recorded successfully.", type: "success" });
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      setActionMessage({ text: err.message ?? "Failed to record citation", type: "error" });
    } finally {
      setSavingCitation(false);
    }
  };

  if (!hasAccess && authorization.data) {
    return (
      <View style={styles.gateCard}>
        <Text style={styles.gateTitle}>AI Desk Access Restricted</Text>
        <Text style={styles.gateSubtitle}>
          You do not have editorial or research capabilities required to access the AI Desk.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollRoot} contentContainerStyle={styles.scrollContent}>
      <StudioAiDeskPresentation
        overview={overviewReq.data ?? null}
        citationsDir={citationsReq.data ?? null}
        selectedTask={selectedTask}
        onSelectTask={setSelectedTask}
        promptText={promptText}
        onChangePromptText={setPromptText}
        contextText={contextText}
        onChangeContextText={setContextText}
        onRunAssist={handleRunAssist}
        runningAssist={runningAssist}
        currentResult={currentResult}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        citationFilter={citationFilter}
        onChangeCitationFilter={setCitationFilter}
        citationSearch={citationSearch}
        onChangeCitationSearch={setCitationSearch}
        onOpenRecordModal={() => setIsRecordModalOpen(true)}
        onUpdateCitationStatus={handleUpdateCitationStatus}
        copiedIndex={copiedIndex}
        onCopySuggestion={handleCopySuggestion}
        canExecuteAssist={canExecute}
        canVerifyCitation={canVerify}
        actionMessage={actionMessage}
      />

      {/* Record Citation Modal */}
      <Modal visible={isRecordModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Record Citation Reference</Text>
            <Text style={styles.modalSubtitle}>
              Link an academic paper, ministry policy document, or NGO baseline study to a story.
            </Text>

            <Text style={styles.modalFieldLabel}>Story UUID *</Text>
            <TextInput
              style={styles.modalInput}
              value={modalStoryId}
              onChangeText={setModalStoryId}
              placeholder="e.g. 00000000-0000-0000-0000-000000000000"
              placeholderTextColor={colors.inkMuted}
            />

            <Text style={styles.modalFieldLabel}>Reference Type *</Text>
            <View style={styles.refTypeRow}>
              {["academic", "institutional", "ngo", "media"].map((type) => (
                <Pressable
                  key={type}
                  style={[styles.pill, modalRefType === type && styles.activePill]}
                  onPress={() => setModalRefType(type)}
                >
                  <Text style={[styles.pillText, modalRefType === type && styles.activePillText]}>
                    {type.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.modalFieldLabel}>Source / Journal Name *</Text>
            <TextInput
              style={styles.modalInput}
              value={modalSourceName}
              onChangeText={setModalSourceName}
              placeholder="e.g. Central African Journal of Medicine"
              placeholderTextColor={colors.inkMuted}
            />

            <Text style={styles.modalFieldLabel}>Document / Article Title</Text>
            <TextInput
              style={styles.modalInput}
              value={modalTitle}
              onChangeText={setModalTitle}
              placeholder="e.g. Epidemiological Surveillance of Cholera in Harare"
              placeholderTextColor={colors.inkMuted}
            />

            <Text style={styles.modalFieldLabel}>Source URL (DOI or Repository Link)</Text>
            <TextInput
              style={styles.modalInput}
              value={modalSourceUrl}
              onChangeText={setModalSourceUrl}
              placeholder="https://doi.org/..."
              placeholderTextColor={colors.inkMuted}
            />

            <View style={styles.modalActionsRow}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setIsRecordModalOpen(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.primaryButton, savingCitation && styles.disabledButton]}
                onPress={handleSaveCitation}
                disabled={savingCitation}
              >
                <Text style={styles.primaryButtonText}>
                  {savingCitation ? "Saving…" : "Save Citation"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollRoot: {
    flex: 1,
    backgroundColor: colors.paper
  },
  scrollContent: {
    paddingBottom: spacing.xxl * 2
  },
  container: {
    gap: spacing.lg
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start"
  },
  headerTextGroup: {
    flex: 1,
    gap: 4
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: colors.ink
  },
  mainSubtitle: {
    fontSize: 14,
    color: colors.inkMuted,
    lineHeight: 20
  },
  safetyNoticeCard: {
    backgroundColor: "#FDF8F6",
    borderColor: "#FBD5C8",
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.sm
  },
  safetyHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  safetyBadge: {
    backgroundColor: "#C2410C",
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm
  },
  safetyBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800"
  },
  safetyNoticeTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#9A3412"
  },
  safetyNoticeBody: {
    fontSize: 13,
    color: "#7C2D12",
    lineHeight: 18
  },
  safetyPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: 4
  },
  rulePill: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FBD5C8",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm
  },
  rulePillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9A3412"
  },
  providerCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md
  },
  providerInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  providerLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.inkMuted,
    letterSpacing: 0.5
  },
  providerModelText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.ink,
    marginTop: 2
  },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm
  },
  statusActive: {
    backgroundColor: "#DCFCE7"
  },
  statusUnconfigured: {
    backgroundColor: "#F3F4F6"
  },
  statusVerified: {
    backgroundColor: "#DCFCE7"
  },
  statusFlagged: {
    backgroundColor: "#FEF3C7"
  },
  statusRejected: {
    backgroundColor: "#FEE2E2"
  },
  statusUnverified: {
    backgroundColor: "#F3F4F6"
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.ink
  },
  statusTextActive: {
    color: "#166534"
  },
  statusTextUnconfigured: {
    color: colors.inkMuted
  },
  actionBanner: {
    borderRadius: radius.sm,
    padding: spacing.md,
    borderWidth: 1
  },
  bannerSuccess: {
    backgroundColor: "#DCFCE7",
    borderColor: "#86EFAC"
  },
  bannerError: {
    backgroundColor: "#FEE2E2",
    borderColor: "#FCA5A5"
  },
  actionBannerText: {
    fontSize: 13,
    fontWeight: "700"
  },
  bannerTextSuccess: {
    color: "#166534"
  },
  bannerTextError: {
    color: "#991B1B"
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: radius.sm,
    padding: 3,
    gap: 4
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderRadius: radius.sm
  },
  activeTabButton: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.inkMuted
  },
  activeTabText: {
    color: colors.ink,
    fontWeight: "800"
  },
  workspaceCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.ink
  },
  taskSelectorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  taskCard: {
    flex: 1,
    minWidth: 200,
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: 4
  },
  taskCardActive: {
    borderColor: colors.blue,
    backgroundColor: "#EFF6FF"
  },
  taskCardTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.ink
  },
  taskCardTitleActive: {
    color: colors.blue
  },
  taskCardDesc: {
    fontSize: 11,
    color: colors.inkMuted,
    lineHeight: 15
  },
  inputSection: {
    gap: spacing.sm,
    marginTop: spacing.sm
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    height: 42,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: "#FAFAFA"
  },
  textArea: {
    height: 90,
    paddingVertical: spacing.sm,
    textAlignVertical: "top"
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end"
  },
  primaryButton: {
    backgroundColor: colors.blue,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14
  },
  disabledButton: {
    opacity: 0.5
  },
  resultsCard: {
    marginTop: spacing.md,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.sm
  },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.ink
  },
  reviewPill: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm
  },
  reviewPillText: {
    color: "#92400E",
    fontSize: 10,
    fontWeight: "800"
  },
  resultsNote: {
    fontSize: 12,
    color: colors.inkMuted,
    marginBottom: spacing.xs
  },
  suggestionsList: {
    gap: spacing.md
  },
  suggestionItem: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: spacing.xs
  },
  suggestionTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  typeBadge: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.ink
  },
  copyButton: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm
  },
  copyButtonActive: {
    backgroundColor: "#DCFCE7"
  },
  copyButtonText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.ink
  },
  copyButtonTextActive: {
    color: "#166534"
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.ink,
    lineHeight: 20
  },
  suggestionRationale: {
    fontSize: 12,
    color: colors.inkMuted,
    lineHeight: 16,
    marginTop: 2
  },
  boldText: {
    fontWeight: "700",
    color: colors.ink
  },
  sessionsContainer: {
    gap: spacing.sm
  },
  sessionCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs
  },
  sessionTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  sessionDate: {
    fontSize: 12,
    color: colors.inkMuted
  },
  sessionPrompt: {
    fontSize: 13,
    color: colors.ink,
    lineHeight: 18
  },
  sessionFooter: {
    marginTop: 2
  },
  sessionMeta: {
    fontSize: 11,
    color: colors.inkMuted
  },
  citationsContainer: {
    gap: spacing.md
  },
  metricsGrid: {
    gap: spacing.md
  },
  gridCols4: {
    flexDirection: "row"
  },
  gridCols2: {
    flexDirection: "row",
    flexWrap: "wrap"
  },
  metricCard: {
    flex: 1,
    minWidth: 130,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.inkMuted
  },
  metricValue: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.ink
  },
  toolbarCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm
  },
  toolbarRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    height: 38,
    fontSize: 13,
    color: colors.ink,
    backgroundColor: "#FAFAFA"
  },
  filterPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  pill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#FFFFFF"
  },
  activePill: {
    backgroundColor: colors.ink,
    borderColor: colors.ink
  },
  pillText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.inkMuted
  },
  activePillText: {
    color: "#FFFFFF"
  },
  citationCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.xs
  },
  citationCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.sm
  },
  citationTitleGroup: {
    flex: 1,
    gap: 2
  },
  citationTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.ink
  },
  citationMeta: {
    fontSize: 12,
    color: colors.inkMuted
  },
  storyLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4
  },
  storyLinkLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.inkMuted
  },
  storyLinkTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.blue
  },
  citationActionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.xs,
    marginTop: spacing.xs
  },
  smallActionBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm
  },
  btnVerify: {
    backgroundColor: "#DCFCE7"
  },
  btnVerifyText: {
    color: "#166534",
    fontSize: 11,
    fontWeight: "700"
  },
  btnFlag: {
    backgroundColor: "#FEF3C7"
  },
  btnFlagText: {
    color: "#92400E",
    fontSize: 11,
    fontWeight: "700"
  },
  btnReject: {
    backgroundColor: "#FEE2E2"
  },
  btnRejectText: {
    color: "#991B1B",
    fontSize: 11,
    fontWeight: "700"
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.xl * 2,
    alignItems: "center",
    gap: spacing.xs
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.ink
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.inkMuted,
    textAlign: "center"
  },
  gateCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.xl * 2,
    alignItems: "center",
    gap: spacing.xs
  },
  gateTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.ink
  },
  gateSubtitle: {
    fontSize: 14,
    color: colors.inkMuted,
    textAlign: "center"
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    padding: spacing.xl,
    width: "100%",
    maxWidth: 520,
    gap: spacing.sm
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.ink
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.inkMuted
  },
  modalFieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink,
    marginTop: 4
  },
  modalInput: {
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    fontSize: 13,
    color: colors.ink
  },
  refTypeRow: {
    flexDirection: "row",
    gap: spacing.xs
  },
  modalActionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.md
  },
  cancelBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm
  },
  cancelBtnText: {
    fontSize: 14,
    color: colors.inkMuted,
    fontWeight: "600"
  }
});
