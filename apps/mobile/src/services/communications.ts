import type {
  CommentModerationService,
  NewsroomCommunicationService,
  ReaderDiscussionService
} from "../domain/contracts";
import type {
  NewsroomInboxItem,
  NewsroomInboxSummary,
  NewsroomInternalComment,
  NewsroomDesk,
  NewsroomThread,
  NewsroomMessage,
  NewsroomAnnouncement,
  NewsroomAssignment,
  ReaderCommentEligibility,
  ReaderCommentModerationItem,
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


async function ensureNewsroomSession(){
  const client=getStagingSupabaseClient() as any;
  const {data:sessionData,error:sessionError}=await client.auth.getSession();
  if(sessionError) throw sessionError;
  if(!sessionData?.session) throw new Error("Server-authorized Newsroom session required.");
  await rpc("newsroom_register_session",{p_user_agent:"healthtimes-native-ca01"});
}

async function selectRows<T>(table:string,query?:(builder:any)=>any):Promise<T[]>{
  const client=getStagingSupabaseClient() as any;
  let builder=client.from(table).select("*");
  if(query) builder=query(builder);
  const {data,error}=await builder;
  if(error) throw new Error(error.message || "HealthTimes communication read failed.");
  return (data ?? []) as T[];
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
    newsletter:numberValue(row?.newsletter),
    moderation:numberValue(row?.moderation),
    unacknowledged:numberValue(row?.unacknowledged)
  };
}

export const stagingNewsroomCommunicationService:NewsroomCommunicationService={
  async listInbox(filter="all",limit=50){
    await ensureNewsroomSession();
    const [rows,summary]=await Promise.all([
      rpc<any[]>("newsroom_list_inbox",{p_filter:filter,p_limit:limit,p_before:null}),
      rpc<Record<string,unknown>>("newsroom_inbox_summary",{})
    ]);
    return {items:(rows ?? []).map(inboxItem),summary:inboxSummary(summary)};
  },
  async markRead(notificationId,read=true){
    await ensureNewsroomSession();
    await rpc("newsroom_mark_notification_read",{p_notification_id:notificationId,p_read:read});
  },
  async acknowledge(notificationId){
    await ensureNewsroomSession();
    await rpc("newsroom_ack_notification",{p_notification_id:notificationId});
  },
  async archive(notificationId){
    await ensureNewsroomSession();
    await rpc("newsroom_archive_notification",{p_notification_id:notificationId});
  },

  async listAssignments(){
    await ensureNewsroomSession();
    const rows=await selectRows<any>("story_assignments",builder=>
      builder.order("updated_at",{ascending:false}).limit(200)
    );
    return rows.map((row):NewsroomAssignment=>({
      id:String(row.id),
      storyId:row.story_id ? String(row.story_id) : null,
      title:String(row.title ?? "Assignment"),
      reporterStaffId:String(row.reporter_staff_id),
      assignedEditorStaffId:row.assigned_editor_staff_id ? String(row.assigned_editor_staff_id) : null,
      desk:row.desk ? String(row.desk) : null,
      deadlineAt:row.deadline_at ? String(row.deadline_at) : null,
      priority:String(row.priority ?? "Normal"),
      notes:row.notes ? String(row.notes) : null,
      status:String(row.status ?? "Assigned"),
      assignedBy:String(row.assigned_by),
      updatedAt:String(row.updated_at ?? "")
    }));
  },

  async listStoryDiscussion(storyId){
    await ensureNewsroomSession();
    const rows=await selectRows<any>("story_internal_comments",builder=>
      builder.eq("story_id",storyId).order("created_at",{ascending:true})
    );
    return rows.map((row):NewsroomInternalComment=>({
      id:String(row.id),
      storyId:String(row.story_id),
      authorStaffId:String(row.author_staff_id),
      body:String(row.body ?? ""),
      parentCommentId:row.parent_comment_id ? String(row.parent_comment_id) : null,
      createdAt:String(row.created_at ?? ""),
      editedAt:row.edited_at ? String(row.edited_at) : null,
      resolvedAt:row.resolved_at ? String(row.resolved_at) : null,
      resolvedBy:row.resolved_by ? String(row.resolved_by) : null
    }));
  },
  async addStoryComment(storyId,body,parentCommentId=null,mentionStaffIds=[]){
    await ensureNewsroomSession();
    const id=await rpc<string>("newsroom_add_internal_comment",{
      p_story_id:storyId,p_body:body,p_parent_comment_id:parentCommentId,p_mention_staff_ids:mentionStaffIds
    });
    return String(id);
  },
  async editStoryComment(commentId,body,mentionStaffIds=null){
    await ensureNewsroomSession();
    await rpc("newsroom_edit_internal_comment",{
      p_comment_id:commentId,p_body:body,p_mention_staff_ids:mentionStaffIds
    });
  },
  async setStoryCommentResolved(commentId,resolved){
    await ensureNewsroomSession();
    await rpc("newsroom_set_internal_comment_resolved",{p_comment_id:commentId,p_resolved:resolved});
  },

  async listDesks(){
    await ensureNewsroomSession();
    const rows=await selectRows<any>("newsroom_desks",builder=>
      builder.is("archived_at",null).order("name",{ascending:true})
    );
    return rows.map((row):NewsroomDesk=>({
      id:String(row.id),key:String(row.key),name:String(row.name),
      description:row.description ? String(row.description) : null,
      archivedAt:row.archived_at ? String(row.archived_at) : null
    }));
  },
  async listThreads(options={}){
    await ensureNewsroomSession();
    const rows=await selectRows<any>("newsroom_threads",builder=>{
      let q=builder.order("updated_at",{ascending:false}).limit(200);
      if(options.deskId) q=q.eq("desk_id",options.deskId);
      if(options.threadType) q=q.eq("thread_type",options.threadType);
      return q;
    });
    return rows.map((row):NewsroomThread=>({
      id:String(row.id),
      threadType:String(row.thread_type) as NewsroomThread["threadType"],
      title:String(row.title),
      assignmentId:row.assignment_id ? String(row.assignment_id) : null,
      deskId:row.desk_id ? String(row.desk_id) : null,
      priority:String(row.priority) as NewsroomThread["priority"],
      status:String(row.status) as NewsroomThread["status"],
      expiresAt:row.expires_at ? String(row.expires_at) : null,
      updatedAt:String(row.updated_at ?? "")
    }));
  },
  async createThread(input){
    await ensureNewsroomSession();
    const id=await rpc<string>("newsroom_create_thread",{
      p_thread_type:input.threadType,
      p_title:input.title,
      p_assignment_id:input.assignmentId ?? null,
      p_desk_id:input.deskId ?? null,
      p_priority:input.priority ?? "normal",
      p_expires_at:input.expiresAt ?? null
    });
    return String(id);
  },
  async listThreadMessages(threadId){
    await ensureNewsroomSession();
    const rows=await selectRows<any>("newsroom_messages",builder=>
      builder.eq("thread_id",threadId).order("created_at",{ascending:true})
    );
    return rows.map((row):NewsroomMessage=>({
      id:String(row.id),threadId:String(row.thread_id),authorStaffId:String(row.author_staff_id),
      parentMessageId:row.parent_message_id ? String(row.parent_message_id) : null,
      body:String(row.body ?? ""),createdAt:String(row.created_at ?? "")
    }));
  },
  async postThreadMessage(threadId,body,parentMessageId=null,mentionStaffIds=[]){
    await ensureNewsroomSession();
    const id=await rpc<string>("newsroom_post_thread_message",{
      p_thread_id:threadId,p_body:body,p_parent_message_id:parentMessageId,p_mention_staff_ids:mentionStaffIds
    });
    return String(id);
  },
  async markThreadRead(threadId){
    await ensureNewsroomSession();
    await rpc("newsroom_mark_thread_read",{p_thread_id:threadId});
  },
  async listAnnouncements(){
    await ensureNewsroomSession();
    const rows=await selectRows<any>("newsroom_announcements",builder=>
      builder.is("archived_at",null).order("published_at",{ascending:false}).limit(100)
    );
    return rows.map((row):NewsroomAnnouncement=>({
      id:String(row.id),title:String(row.title),body:String(row.body),
      audienceScope:String(row.audience_scope) as NewsroomAnnouncement["audienceScope"],
      deskId:row.desk_id ? String(row.desk_id) : null,
      priority:String(row.priority) as NewsroomAnnouncement["priority"],
      requiresAck:Boolean(row.requires_ack),
      publishedAt:String(row.published_at ?? ""),
      expiresAt:row.expires_at ? String(row.expires_at) : null
    }));
  }
};

export const stagingCommentModerationService:CommentModerationService={
  async listQueue(state=null,limit=50){
    await ensureNewsroomSession();
    const rows=await rpc<any[]>("newsroom_list_comment_moderation_queue",{
      p_state:state,p_limit:limit
    });
    return (rows ?? []).map((row):ReaderCommentModerationItem=>({
      id:String(row.id),
      storyId:String(row.story_id),
      authorProfileId:String(row.author_profile_id),
      parentCommentId:row.parent_comment_id ? String(row.parent_comment_id) : null,
      body:String(row.body ?? ""),
      state:String(row.state) as ReaderCommentModerationItem["state"],
      riskFlags:Array.isArray(row.risk_flags) ? row.risk_flags.map(String) : [],
      createdAt:String(row.created_at ?? ""),
      editedAt:row.edited_at ? String(row.edited_at) : null,
      publishedAt:row.published_at ? String(row.published_at) : null
    }));
  },
  async moderate(commentId,action,reasonCode,notes=null){
    await ensureNewsroomSession();
    return String(await rpc<string>("newsroom_moderate_story_comment",{
      p_comment_id:commentId,p_action:action,p_reason_code:reasonCode,p_notes:notes
    }));
  },
  async setStoryCommentPolicy(storyId,policy){
    await ensureNewsroomSession();
    return String(await rpc<string>("newsroom_set_story_comment_policy",{p_story_id:storyId,p_policy:policy}));
  },
  async restrictReader(readerProfileId,kind,reasonCode,endsAt=null,notes=null){
    await ensureNewsroomSession();
    return String(await rpc<string>("newsroom_restrict_reader_comments",{
      p_reader_profile_id:readerProfileId,p_kind:kind,p_reason_code:reasonCode,p_ends_at:endsAt,p_notes:notes
    }));
  },
  async liftRestriction(restrictionId,notes=null){
    await ensureNewsroomSession();
    await rpc("newsroom_lift_reader_comment_restriction",{p_restriction_id:restrictionId,p_notes:notes});
  }
};
