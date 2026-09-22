import type {
  NewsroomCommunicationService,
  ReaderDiscussionService
} from "../domain/contracts";
import type {
  NewsroomInboxItem,
  NewsroomInboxSummary,
  ReaderCommentEligibility,
  ReaderStoryComment
} from "../domain/models";
import { getStagingSupabaseClient } from "../platform/supabase";

const canonicalStoryPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireCanonicalStoryId(value:string|null){
  if(!value || !canonicalStoryPattern.test(value)){
    throw new Error("Canonical HealthTimes story identity is required before discussion can be used.");
  }
  return value;
}

async function rpc<T>(name:string,args:Record<string,unknown>={}):Promise<T>{
  const client=getStagingSupabaseClient() as any;
  const {data,error}=await client.rpc(name,args);
  if(error) throw new Error(error.message || "HealthTimes communication request failed.");
  return data as T;
}

function numberValue(value:unknown){
  const parsed=Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export const stagingReaderDiscussionService:ReaderDiscussionService={
  async registerProfile(displayName){
    const id=await rpc<string>("reader_register_comment_profile",{p_display_name:displayName});
    return String(id);
  },
  async getEligibility(canonicalStoryId){
    if(!canonicalStoryId || !canonicalStoryPattern.test(canonicalStoryId)){
      return {status:"blocked",reason:"canonical_story_required",profileId:null,publishedCommentCount:0};
    }
    const result=await rpc<Record<string,unknown>>("reader_comment_eligibility",{p_story_id:canonicalStoryId});
    return {
      status:(result.status==="allowed"||result.status==="pre_moderated" ? result.status : "blocked") as ReaderCommentEligibility["status"],
      reason:String(result.reason ?? "unknown"),
      profileId:typeof result.profile_id==="string" ? result.profile_id : null,
      publishedCommentCount:numberValue(result.published_comment_count)
    };
  },
  async listPublic(canonicalStoryId){
    if(!canonicalStoryId || !canonicalStoryPattern.test(canonicalStoryId)) return [];
    const rows=await rpc<any[]>("reader_public_story_comments",{
      p_story_id:canonicalStoryId,
      p_limit:50,
      p_before:null
    });
    return (rows ?? []).map((row):ReaderStoryComment=>({
      id:String(row.id),
      storyId:String(row.story_id),
      parentCommentId:row.parent_comment_id ? String(row.parent_comment_id) : null,
      displayName:String(row.display_name ?? "Reader"),
      body:String(row.body ?? ""),
      publishedAt:String(row.published_at ?? ""),
      edited:Boolean(row.edited)
    }));
  },
  async submit(canonicalStoryId,body,parentCommentId=null){
    const storyId=requireCanonicalStoryId(canonicalStoryId);
    const id=await rpc<string>("reader_submit_story_comment",{
      p_story_id:storyId,
      p_body:body,
      p_parent_comment_id:parentCommentId
    });
    return String(id);
  },
  async edit(commentId,body){
    await rpc("reader_edit_story_comment",{p_comment_id:commentId,p_body:body});
  },
  async withdraw(commentId){
    await rpc("reader_withdraw_story_comment",{p_comment_id:commentId});
  },
  async report(commentId,reasonCode,details=null){
    const id=await rpc<string>("reader_report_story_comment",{
      p_comment_id:commentId,
      p_reason_code:reasonCode,
      p_details:details
    });
    return String(id);
  }
};

function inboxItem(row:any):NewsroomInboxItem{
  return {
    id:String(row.id),
    eventType:String(row.event_type ?? ""),
    targetTable:row.target_table ? String(row.target_table) : null,
    targetId:row.target_id ? String(row.target_id) : null,
    category:String(row.category ?? "general") as NewsroomInboxItem["category"],
    priority:(row.priority==="urgent"||row.priority==="high" ? row.priority : "normal"),
    payload:(row.payload && typeof row.payload==="object" ? row.payload : {}) as Record<string,unknown>,
    readAt:row.read_at ? String(row.read_at) : null,
    requiresAck:Boolean(row.requires_ack),
    acknowledgedAt:row.acknowledged_at ? String(row.acknowledged_at) : null,
    archivedAt:row.archived_at ? String(row.archived_at) : null,
    createdAt:String(row.created_at ?? "")
  };
}

function inboxSummary(row:any):NewsroomInboxSummary{
  return {
    unreadTotal:numberValue(row?.unread_total),
    mentions:numberValue(row?.mentions),
    assignments:numberValue(row?.assignments),
    reviews:numberValue(row?.reviews),
    urgent:numberValue(row?.urgent),
    announcements:numberValue(row?.announcements),
    moderation:numberValue(row?.moderation),
    unacknowledged:numberValue(row?.unacknowledged)
  };
}

export const stagingNewsroomCommunicationService:NewsroomCommunicationService={
  async listInbox(filter="all",limit=50){
    const [rows,summary]=await Promise.all([
      rpc<any[]>("newsroom_list_inbox",{p_filter:filter,p_limit:limit,p_before:null}),
      rpc<Record<string,unknown>>("newsroom_inbox_summary",{})
    ]);
    return {items:(rows ?? []).map(inboxItem),summary:inboxSummary(summary)};
  },
  async markRead(notificationId,read=true){
    await rpc("newsroom_mark_notification_read",{p_notification_id:notificationId,p_read:read});
  },
  async acknowledge(notificationId){
    await rpc("newsroom_ack_notification",{p_notification_id:notificationId});
  },
  async archive(notificationId){
    await rpc("newsroom_archive_notification",{p_notification_id:notificationId});
  }
};
