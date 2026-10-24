import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type ViewStyle
} from "react-native";
import type {
  NewsroomAuthorItem,
  NewsroomAuthorsDirectory,
  NewsroomSectionItem,
  NewsroomTaxonomyDirectory
} from "../domain/models";
import {
  canManageAuthors,
  hasAuthorsDeskAccess,
  emptyAuthorizationSnapshot,
  type AuthorizationSnapshot
} from "../security/capabilities";
import { services } from "../services";
import { breakpoints, colors, radius, spacing } from "../theme/tokens";

export interface StudioAuthorsDeskViewProps {
  directory: NewsroomAuthorsDirectory | null;
  taxonomy: NewsroomTaxonomyDirectory | null;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
  searchQuery: string;
  onChangeSearchQuery: (query: string) => void;
  activeTab: "authors" | "taxonomy";
  onChangeTab: (tab: "authors" | "taxonomy") => void;
  onCreateAuthor: (displayName: string, slug?: string, bio?: string) => Promise<void>;
  onUpdateAuthor: (authorId: string, displayName: string, bio?: string) => Promise<void>;
  onBindStaffAuthor: (staffId: string, authorId: string | null) => Promise<void>;
  onCreateSection: (name: string, slug?: string, parentId?: string | null) => Promise<void>;
  canManage: boolean;
  actionMessage: string | null;
  isMutating: boolean;
  isOwnerPreview?: boolean;
}

export function StudioAuthorsDeskView({
  directory,
  taxonomy,
  isLoading,
  error,
  onRefresh,
  searchQuery,
  onChangeSearchQuery,
  activeTab,
  onChangeTab,
  onCreateAuthor,
  onUpdateAuthor,
  onBindStaffAuthor,
  onCreateSection,
  canManage,
  actionMessage,
  isMutating,
  isOwnerPreview = false
}: StudioAuthorsDeskViewProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= breakpoints.desktop;

  // Modal State
  const [isAuthorModalOpen, setIsAuthorModalOpen] = useState(false);
  const [authorName, setAuthorName] = useState("");
  const [authorSlug, setAuthorSlug] = useState("");
  const [authorBio, setAuthorBio] = useState("");
  const [editingAuthorId, setEditingAuthorId] = useState<string | null>(null);

  const [isBindModalOpen, setIsBindModalOpen] = useState(false);
  const [bindAuthorId, setBindAuthorId] = useState<string | null>(null);
  const [bindStaffId, setBindStaffId] = useState("");

  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [sectionName, setSectionName] = useState("");
  const [sectionSlug, setSectionSlug] = useState("");
  const [sectionParentId, setSectionParentId] = useState("");
  const [sectionValidationError, setSectionValidationError] = useState<string | null>(null);

  const metrics = directory?.metrics;
  const taxMetrics = taxonomy?.metrics;

  const handleOpenCreateAuthor = () => {
    setEditingAuthorId(null);
    setAuthorName("");
    setAuthorSlug("");
    setAuthorBio("");
    setIsAuthorModalOpen(true);
  };

  const handleOpenEditAuthor = (author: NewsroomAuthorItem) => {
    setEditingAuthorId(author.id);
    setAuthorName(author.displayName);
    setAuthorSlug(author.slug);
    setAuthorBio(author.bio ?? "");
    setIsAuthorModalOpen(true);
  };

  const handleSaveAuthor = async () => {
    if (!authorName.trim()) return;
    if (editingAuthorId) {
      await onUpdateAuthor(editingAuthorId, authorName.trim(), authorBio.trim() ? authorBio.trim() : undefined);
    } else {
      await onCreateAuthor(
        authorName.trim(),
        authorSlug.trim() ? authorSlug.trim() : undefined,
        authorBio.trim() ? authorBio.trim() : undefined
      );
    }
    setIsAuthorModalOpen(false);
  };

  const handleOpenBind = (author: NewsroomAuthorItem) => {
    setBindAuthorId(author.id);
    setBindStaffId(author.boundStaffId ?? "");
    setIsBindModalOpen(true);
  };

  const handleSaveBind = async () => {
    if (!bindStaffId.trim()) return;
    await onBindStaffAuthor(bindStaffId.trim(), bindAuthorId);
    setIsBindModalOpen(false);
  };

  const handleUnbind = async (staffId: string) => {
    await onBindStaffAuthor(staffId, null);
  };

  const handleSaveSection = async () => {
    const rawName = sectionName.trim();
    if (!rawName) return;
    const normalizedName = rawName.toLowerCase();
    const candidateSlug = (
      sectionSlug.trim() ||
      rawName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
    ).toLowerCase();

    // UAT04A-035: Check duplicate slug or duplicate name against existing sections
    const existingSections = taxonomy?.sections ?? [];
    const duplicateSlug = existingSections.some(
      (s) => s.slug.toLowerCase() === candidateSlug
    );
    if (duplicateSlug) {
      setSectionValidationError(
        `A section with the slug "${candidateSlug}" already exists. Slugs must be unique across newsroom taxonomy.`
      );
      return;
    }

    const duplicateName = existingSections.some(
      (s) => s.name.trim().toLowerCase() === normalizedName
    );
    if (duplicateName) {
      setSectionValidationError(
        `A section named "${rawName}" already exists. Section names must be unique.`
      );
      return;
    }

    setSectionValidationError(null);
    await onCreateSection(
      rawName,
      candidateSlug,
      sectionParentId.trim() ? sectionParentId.trim() : undefined
    );
    setIsSectionModalOpen(false);
    setSectionName("");
    setSectionSlug("");
    setSectionParentId("");
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Authors & Taxonomy Desk</Text>
          <Text style={styles.subtitle}>
            Public byline registry, WordPress migration provenance, staff profile reconciliation, and hierarchical taxonomy sections.
          </Text>
        </View>
        <View style={styles.headerActions}>
          {canManage && (
            <>
              {activeTab === "authors" ? (
                <Pressable
                  style={[styles.primaryButton, isMutating && styles.buttonDisabled]}
                  onPress={handleOpenCreateAuthor}
                  disabled={isMutating}
                >
                  <Text style={styles.primaryButtonText}>+ Add Author</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={[styles.primaryButton, isMutating && styles.buttonDisabled]}
                  onPress={() => {
                    setSectionValidationError(null);
                    setIsSectionModalOpen(true);
                  }}
                  disabled={isMutating}
                >
                  <Text style={styles.primaryButtonText}>+ Add Section</Text>
                </Pressable>
              )}
            </>
          )}
          <Pressable
            style={[styles.secondaryButton, isMutating && styles.buttonDisabled]}
            onPress={onRefresh}
            disabled={isMutating}
          >
            <Text style={styles.secondaryButtonText}>↻ Refresh</Text>
          </Pressable>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tabItem, activeTab === "authors" && styles.tabItemActive]}
          onPress={() => onChangeTab("authors")}
        >
          <Text style={[styles.tabText, activeTab === "authors" && styles.tabTextActive]}>
            Public Authors ({metrics?.totalAuthors ?? 0})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabItem, activeTab === "taxonomy" && styles.tabItemActive]}
          onPress={() => onChangeTab("taxonomy")}
        >
          <Text style={[styles.tabText, activeTab === "taxonomy" && styles.tabTextActive]}>
            Taxonomy & Sections ({taxMetrics?.totalSections ?? 0})
          </Text>
        </Pressable>
      </View>

      {/* Action Feedback Banner */}
      {actionMessage && (
        <View style={styles.bannerSuccess}>
          <Text style={styles.bannerSuccessText}>{actionMessage}</Text>
        </View>
      )}

      {/* Error Message */}
      {error && (
        <View style={styles.bannerError}>
          <Text style={styles.bannerErrorText}>Error: {error}</Text>
        </View>
      )}

      {/* Metrics Row */}
      {activeTab === "authors" ? (
        <View style={[styles.metricsGrid, isDesktop && styles.metricsGridDesktop]}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Total Public Authors</Text>
            <Text style={styles.metricValue}>{metrics?.totalAuthors ?? 0}</Text>
            <Text style={styles.metricSub}>Registered story bylines</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Migrated Provenance</Text>
            <Text style={styles.metricValue}>{metrics?.migratedAuthorsCount ?? 0}</Text>
            <Text style={styles.metricSub}>Imported from WordPress</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Staff Profile Bound</Text>
            <Text style={[styles.metricValue, { color: "#166534" }]}>{metrics?.boundAuthorsCount ?? 0}</Text>
            <Text style={styles.metricSub}>Linked to newsroom users</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Unbound Bylines</Text>
            <Text style={[styles.metricValue, { color: "#B45309" }]}>{metrics?.unboundAuthorsCount ?? 0}</Text>
            <Text style={styles.metricSub}>Legacy or guest authors</Text>
          </View>
        </View>
      ) : (
        <View style={[styles.metricsGrid, isDesktop && styles.metricsGridDesktop]}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Total Editorial Sections</Text>
            <Text style={styles.metricValue}>{taxMetrics?.totalSections ?? 0}</Text>
            <Text style={styles.metricSub}>Published taxonomy terms</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Root Sections</Text>
            <Text style={styles.metricValue}>{taxMetrics?.rootSectionsCount ?? 0}</Text>
            <Text style={styles.metricSub}>Primary top-level desks</Text>
          </View>
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={activeTab === "authors" ? "Search authors by name, slug, or bound staff..." : "Search sections by name or slug..."}
          placeholderTextColor={colors.inkMuted}
          value={searchQuery}
          onChangeText={onChangeSearchQuery}
        />
      </View>

      {/* Authors List View */}
      {activeTab === "authors" && (
        <View style={styles.tableCard}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Author & Byline</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Slug & Publication Identifier</Text>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Staff Binding</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: "center" }]}>Stories</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: "right" }]}>Actions</Text>
          </View>

          {isLoading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Loading authors directory...</Text>
            </View>
          ) : !directory?.authors || directory.authors.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No authors found matching search criteria.</Text>
            </View>
          ) : (
            directory.authors.map((author) => (
              <View style={styles.tableRow} key={author.id}>
                <View style={[styles.tableCell, { flex: 2 }]}>
                  <Text style={styles.authorName}>{author.displayName}</Text>
                  {author.bio ? (
                    <Text style={styles.authorBio} numberOfLines={2}>
                      {author.bio}
                    </Text>
                  ) : (
                    <Text style={styles.authorBioEmpty}>No bio provided</Text>
                  )}
                </View>

                <View style={[styles.tableCell, { flex: 1.5 }]}>
                  <Text style={styles.codeBadge}>/{author.slug}</Text>
                  {author.role && (
                    <View style={styles.roleBadge} testID={`author-role-${author.id}`}>
                      <Text style={styles.roleBadgeText}>{author.role}</Text>
                    </View>
                  )}
                  {author.desk && (
                    <View style={styles.deskBadge} testID={`author-desk-${author.id}`}>
                      <Text style={styles.deskBadgeText}>{author.desk}</Text>
                    </View>
                  )}
                  {author.status && (
                    <View style={styles.statusBadgeSmall} testID={`author-status-${author.id}`}>
                      <Text style={styles.statusBadgeSmallText}>{author.status.toUpperCase()}</Text>
                    </View>
                  )}
                  {!isOwnerPreview && author.wordpressSourceId && (
                    <View style={styles.wpBadge}>
                      <Text style={styles.wpBadgeText}>WP ID: {author.wordpressSourceId}</Text>
                    </View>
                  )}
                </View>

                <View style={[styles.tableCell, { flex: 2 }]}>
                  {author.boundStaffId ? (
                    <View>
                      <View style={styles.boundBadge}>
                        <Text style={styles.boundBadgeText}>✓ Bound: {author.boundStaffName}</Text>
                      </View>
                      {author.boundStaffEmail && (
                        <Text style={styles.boundEmail}>{author.boundStaffEmail}</Text>
                      )}
                      {canManage && (
                        <Pressable
                          style={styles.unbindButton}
                          onPress={() => handleUnbind(author.boundStaffId!)}
                        >
                          <Text style={styles.unbindButtonText}>Unbind</Text>
                        </Pressable>
                      )}
                    </View>
                  ) : (
                    <View>
                      <Text style={styles.unboundLabel}>Unbound Byline</Text>
                      {canManage && (
                        <Pressable
                          style={styles.bindButton}
                          onPress={() => handleOpenBind(author)}
                        >
                          <Text style={styles.bindButtonText}>+ Bind to Staff</Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </View>

                <View style={[styles.tableCell, { flex: 1, alignItems: "center" }]}>
                  <View style={styles.storyCountBadge}>
                    <Text style={styles.storyCountText}>{author.storyCount}</Text>
                  </View>
                </View>

                <View style={[styles.tableCell, { flex: 1.5, alignItems: "flex-end" }]}>
                  {canManage && (
                    <Pressable
                      style={styles.actionBtnSmall}
                      onPress={() => handleOpenEditAuthor(author)}
                    >
                      <Text style={styles.actionBtnText}>Edit</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {/* Taxonomy List View */}
      {activeTab === "taxonomy" && (
        <View style={styles.tableCard}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Section Name</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Slug</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Parent Section</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: "center" }]}>Stories</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: "right" }]}>Provenance</Text>
          </View>

          {isLoading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Loading taxonomy sections...</Text>
            </View>
          ) : !taxonomy?.sections || taxonomy.sections.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No sections found matching search criteria.</Text>
            </View>
          ) : (
            taxonomy.sections.map((sec) => (
              <View style={styles.tableRow} key={sec.id}>
                <View style={[styles.tableCell, { flex: 2 }]}>
                  <Text style={styles.authorName}>{sec.name}</Text>
                </View>
                <View style={[styles.tableCell, { flex: 1.5 }]}>
                  <Text style={styles.codeBadge}>/{sec.slug}</Text>
                </View>
                <View style={[styles.tableCell, { flex: 1.5 }]}>
                  {sec.parentName ? (
                    <Text style={styles.parentText}>↳ {sec.parentName}</Text>
                  ) : (
                    <Text style={styles.rootText}>Top Level</Text>
                  )}
                </View>
                <View style={[styles.tableCell, { flex: 1, alignItems: "center" }]}>
                  <View style={styles.storyCountBadge}>
                    <Text style={styles.storyCountText}>{sec.storyCount}</Text>
                  </View>
                </View>
                <View style={[styles.tableCell, { flex: 1.5, alignItems: "flex-end" }]}>
                  {sec.wordpressSourceId ? (
                    <View style={styles.wpBadge}>
                      <Text style={styles.wpBadgeText}>WP #{sec.wordpressSourceId}</Text>
                    </View>
                  ) : (
                    <Text style={styles.nativeBadge}>Native</Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {/* Author Modal */}
      {isAuthorModalOpen && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingAuthorId ? "Edit Author Profile" : "Create New Author Profile"}
            </Text>
            <Text style={styles.modalSub}>
              Public authors appear on article bylines. You can later bind this author to a newsroom staff profile.
            </Text>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Display Name *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Dr. Rudo Chigwedere"
                placeholderTextColor={colors.inkMuted}
                value={authorName}
                onChangeText={setAuthorName}
              />
            </View>

            {!editingAuthorId && (
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Slug (optional)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. rudo-chigwedere"
                  placeholderTextColor={colors.inkMuted}
                  value={authorSlug}
                  onChangeText={setAuthorSlug}
                />
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Public Bio</Text>
              <TextInput
                style={[styles.formInput, styles.formTextarea]}
                placeholder="Brief professional background, medical beats, or institutional affiliation..."
                placeholderTextColor={colors.inkMuted}
                value={authorBio}
                onChangeText={setAuthorBio}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => setIsAuthorModalOpen(false)}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.primaryButton, !authorName.trim() && styles.buttonDisabled]}
                onPress={handleSaveAuthor}
                disabled={!authorName.trim()}
              >
                <Text style={styles.primaryButtonText}>Save Author</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Bind Staff Modal */}
      {isBindModalOpen && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Bind Author to Staff Profile</Text>
            <Text style={styles.modalSub}>
              Connect this public author byline to a registered newsroom staff member UUID.
            </Text>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Staff Profile UUID *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Paste staff profile UUID from Staff & Roles"
                placeholderTextColor={colors.inkMuted}
                value={bindStaffId}
                onChangeText={setBindStaffId}
              />
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => setIsBindModalOpen(false)}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.primaryButton, !bindStaffId.trim() && styles.buttonDisabled]}
                onPress={handleSaveBind}
                disabled={!bindStaffId.trim()}
              >
                <Text style={styles.primaryButtonText}>Confirm Binding</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Section Modal */}
      {isSectionModalOpen && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create Taxonomy Section</Text>
            <Text style={styles.modalSub}>
              Add an editorial desk or topic category for article classification.
            </Text>

            {sectionValidationError ? (
              <View style={styles.errorAlert} testID="taxonomy-validation-error">
                <Text style={styles.errorAlertText}>❌ {sectionValidationError}</Text>
              </View>
            ) : null}

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Section Name *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Maternal Health & Pediatrics"
                placeholderTextColor={colors.inkMuted}
                value={sectionName}
                onChangeText={(text) => {
                  setSectionName(text);
                  if (sectionValidationError) setSectionValidationError(null);
                }}
                testID="taxonomy-section-name-input"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Slug (optional)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. maternal-health"
                placeholderTextColor={colors.inkMuted}
                value={sectionSlug}
                onChangeText={(text) => {
                  setSectionSlug(text);
                  if (sectionValidationError) setSectionValidationError(null);
                }}
                testID="taxonomy-section-slug-input"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Parent Section (Optional)</Text>
              <View style={styles.parentPickerContainer} testID="taxonomy-parent-picker">
                <Pressable
                  style={[
                    styles.parentOptionChip,
                    !sectionParentId && styles.parentOptionChipActive
                  ]}
                  onPress={() => setSectionParentId("")}
                  testID="parent-opt-none"
                >
                  <Text
                    style={[
                      styles.parentOptionText,
                      !sectionParentId && styles.parentOptionTextActive
                    ]}
                  >
                    Top Level (No Parent)
                  </Text>
                </Pressable>
                {taxonomy?.sections.map((sec) => (
                  <Pressable
                    key={sec.id}
                    style={[
                      styles.parentOptionChip,
                      sectionParentId === sec.id && styles.parentOptionChipActive
                    ]}
                    onPress={() => setSectionParentId(sec.id)}
                    testID={`parent-opt-${sec.slug}`}
                  >
                    <Text
                      style={[
                        styles.parentOptionText,
                        sectionParentId === sec.id && styles.parentOptionTextActive
                      ]}
                      numberOfLines={1}
                    >
                      {sec.name} (/{sec.slug})
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => setIsSectionModalOpen(false)}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.primaryButton, !sectionName.trim() && styles.buttonDisabled]}
                onPress={handleSaveSection}
                disabled={!sectionName.trim()}
              >
                <Text style={styles.primaryButtonText}>Create Section</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

export function StudioAuthorsDesk() {
  const [snapshot, setSnapshot] = useState<AuthorizationSnapshot>(
    emptyAuthorizationSnapshot("server-policy-unavailable", "initializing")
  );
  const [directory, setDirectory] = useState<NewsroomAuthorsDirectory | null>(null);
  const [taxonomy, setTaxonomy] = useState<NewsroomTaxonomyDirectory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"authors" | "taxonomy">("authors");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const authSnap = await services.authorization.getSnapshot();
      setSnapshot(authSnap);

      if (!hasAuthorsDeskAccess(authSnap)) {
        setIsLoading(false);
        return;
      }

      const [authorsData, taxonomyData] = await Promise.all([
        services.newsroomAuthors.getAuthorsDirectory({
          search: searchQuery.trim() ? searchQuery.trim() : null
        }),
        services.newsroomAuthors.getTaxonomyDirectory({
          search: searchQuery.trim() ? searchQuery.trim() : null
        })
      ]);

      setDirectory(authorsData);
      setTaxonomy(taxonomyData);
    } catch (err: any) {
      setError(err.message ?? "Failed to load authors directory");
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const canManage = canManageAuthors(snapshot);

  const handleCreateAuthor = async (displayName: string, slug?: string, bio?: string) => {
    try {
      setIsMutating(true);
      setActionMessage(null);
      await services.newsroomAuthors.createAuthor({ displayName, slug, bio });
      setActionMessage(`Author "${displayName}" registered successfully.`);
      await loadData();
    } catch (err: any) {
      setError(err.message ?? "Failed to create author");
    } finally {
      setIsMutating(false);
    }
  };

  const handleUpdateAuthor = async (authorId: string, displayName: string, bio?: string) => {
    try {
      setIsMutating(true);
      setActionMessage(null);
      await services.newsroomAuthors.updateAuthor({ authorId, displayName, bio });
      setActionMessage(`Author profile updated.`);
      await loadData();
    } catch (err: any) {
      setError(err.message ?? "Failed to update author");
    } finally {
      setIsMutating(false);
    }
  };

  const handleBindStaffAuthor = async (staffId: string, authorId: string | null) => {
    try {
      setIsMutating(true);
      setActionMessage(null);
      await services.newsroomAuthors.bindStaffAuthor({ staffId, authorId });
      setActionMessage(authorId ? "Staff member successfully bound to author." : "Staff member unbound from author.");
      await loadData();
    } catch (err: any) {
      setError(err.message ?? "Failed to bind author");
    } finally {
      setIsMutating(false);
    }
  };

  const handleCreateSection = async (name: string, slug?: string, parentId?: string | null) => {
    try {
      setIsMutating(true);
      setActionMessage(null);
      await services.newsroomAuthors.createSection({ name, slug, parentId });
      setActionMessage(`Section "${name}" created successfully.`);
      await loadData();
    } catch (err: any) {
      setError(err.message ?? "Failed to create section");
    } finally {
      setIsMutating(false);
    }
  };

  if (!isLoading && !hasAuthorsDeskAccess(snapshot)) {
    return (
      <View style={styles.deniedContainer}>
        <Text style={styles.deniedTitle}>Access Denied</Text>
        <Text style={styles.deniedText}>
          You do not have the required staff.view or story editorial capability to access the Authors & Taxonomy Desk.
        </Text>
      </View>
    );
  }

  return (
    <StudioAuthorsDeskView
      directory={directory}
      taxonomy={taxonomy}
      isLoading={isLoading}
      error={error}
      onRefresh={loadData}
      searchQuery={searchQuery}
      onChangeSearchQuery={setSearchQuery}
      activeTab={activeTab}
      onChangeTab={setActiveTab}
      onCreateAuthor={handleCreateAuthor}
      onUpdateAuthor={handleUpdateAuthor}
      onBindStaffAuthor={handleBindStaffAuthor}
      onCreateSection={handleCreateSection}
      canManage={canManage}
      actionMessage={actionMessage}
      isMutating={isMutating}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paperMuted
  },
  content: {
    padding: spacing.xl,
    gap: spacing.lg
  },
  header: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md
  },
  headerLeft: {
    flex: 1,
    minWidth: 280
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.ink,
    letterSpacing: -0.5
  },
  subtitle: {
    fontSize: 14,
    color: colors.inkMuted,
    marginTop: 4,
    lineHeight: 20
  },
  headerActions: {
    flexDirection: "row",
    gap: spacing.sm
  },
  primaryButton: {
    backgroundColor: colors.blue,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    justifyContent: "center",
    alignItems: "center"
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600"
  },
  secondaryButton: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    justifyContent: "center",
    alignItems: "center"
  },
  secondaryButtonText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "600"
  },
  buttonDisabled: {
    opacity: 0.5
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.lg
  },
  tabItem: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: "transparent"
  },
  tabItemActive: {
    borderBottomColor: colors.blue
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.inkMuted
  },
  tabTextActive: {
    color: colors.blue,
    fontWeight: "600"
  },
  metricsGrid: {
    flexDirection: "column",
    gap: spacing.md
  },
  metricsGridDesktop: {
    flexDirection: "row"
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg
  },
  metricLabel: {
    fontSize: 12,
    color: colors.inkMuted,
    textTransform: "uppercase",
    fontWeight: "600",
    letterSpacing: 0.5
  },
  metricValue: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.ink,
    marginVertical: 4
  },
  metricSub: {
    fontSize: 12,
    color: colors.inkMuted
  },
  searchContainer: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === "ios" ? spacing.sm : 2
  },
  searchInput: {
    fontSize: 14,
    color: colors.ink,
    minHeight: 36
  },
  tableCard: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: "hidden"
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.paperMuted,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  tableHeaderCell: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.inkMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  tableCell: {
    justifyContent: "center"
  },
  authorName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.ink
  },
  authorBio: {
    fontSize: 12,
    color: colors.inkMuted,
    marginTop: 2
  },
  authorBioEmpty: {
    fontSize: 12,
    color: colors.inkMuted,
    fontStyle: "italic",
    marginTop: 2
  },
  codeBadge: {
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    color: colors.ink,
    backgroundColor: colors.paperMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    alignSelf: "flex-start"
  },
  wpBadge: {
    backgroundColor: "#F3E8FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginTop: 4,
    alignSelf: "flex-start"
  },
  wpBadgeText: {
    fontSize: 11,
    color: "#6B21A8",
    fontWeight: "600"
  },
  nativeBadge: {
    fontSize: 11,
    color: colors.inkMuted,
    fontStyle: "italic"
  },
  boundBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    alignSelf: "flex-start"
  },
  boundBadgeText: {
    fontSize: 11,
    color: "#166534",
    fontWeight: "600"
  },
  boundEmail: {
    fontSize: 11,
    color: colors.inkMuted,
    marginTop: 2
  },
  unbindButton: {
    marginTop: 4,
    alignSelf: "flex-start"
  },
  unbindButtonText: {
    fontSize: 11,
    color: "#DC2626",
    textDecorationLine: "underline"
  },
  unboundLabel: {
    fontSize: 12,
    color: "#B45309",
    fontWeight: "500"
  },
  bindButton: {
    marginTop: 4,
    alignSelf: "flex-start"
  },
  bindButtonText: {
    fontSize: 11,
    color: colors.blue,
    fontWeight: "600"
  },
  storyCountBadge: {
    backgroundColor: colors.paperMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border
  },
  storyCountText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.ink
  },
  parentText: {
    fontSize: 13,
    color: colors.ink
  },
  rootText: {
    fontSize: 12,
    color: colors.inkMuted,
    fontWeight: "500"
  },
  actionBtnSmall: {
    backgroundColor: colors.paperMuted,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.ink
  },
  emptyState: {
    padding: spacing.xxl,
    alignItems: "center",
    justifyContent: "center"
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.inkMuted
  },
  bannerSuccess: {
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#86EFAC",
    padding: spacing.md,
    borderRadius: radius.md
  },
  bannerSuccessText: {
    color: "#166534",
    fontSize: 13,
    fontWeight: "500"
  },
  bannerError: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    padding: spacing.md,
    borderRadius: radius.md
  },
  bannerErrorText: {
    color: "#991B1B",
    fontSize: 13,
    fontWeight: "500"
  },
  modalOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
    zIndex: 1000
  },
  modalCard: {
    backgroundColor: colors.paper,
    borderRadius: radius.lg,
    padding: spacing.xl,
    width: "100%",
    maxWidth: 480,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    gap: spacing.md
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.ink
  },
  modalSub: {
    fontSize: 13,
    color: colors.inkMuted,
    lineHeight: 18
  },
  formGroup: {
    gap: 4
  },
  formLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.ink
  },
  formInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === "ios" ? spacing.sm : 6,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: colors.paperMuted
  },
  formTextarea: {
    minHeight: 70,
    textAlignVertical: "top"
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.sm
  },
  deniedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xxl
  },
  deniedTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#991B1B",
    marginBottom: spacing.xs
  },
  deniedText: {
    fontSize: 14,
    color: colors.inkMuted,
    textAlign: "center",
    maxWidth: 400
  },
  roleBadge: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginTop: 4,
    alignSelf: "flex-start"
  },
  roleBadgeText: {
    fontSize: 11,
    color: "#1E40AF",
    fontWeight: "600"
  },
  deskBadge: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginTop: 2,
    alignSelf: "flex-start"
  },
  deskBadgeText: {
    fontSize: 10,
    color: "#166534",
    fontWeight: "500"
  },
  statusBadgeSmall: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radius.sm,
    marginTop: 2,
    alignSelf: "flex-start"
  },
  statusBadgeSmallText: {
    fontSize: 9,
    color: "#4B5563",
    fontWeight: "700"
  },
  parentPickerContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4
  },
  parentOptionChip: {
    backgroundColor: colors.paperMuted,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm
  },
  parentOptionChipActive: {
    backgroundColor: colors.blue,
    borderColor: colors.blue
  },
  parentOptionText: {
    fontSize: 12,
    color: colors.ink
  },
  parentOptionTextActive: {
    color: "#FFFFFF",
    fontWeight: "600"
  },
  errorAlert: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.md
  },
  errorAlertText: {
    fontSize: 12,
    color: "#B91C1C",
    fontWeight: "600"
  }
});
