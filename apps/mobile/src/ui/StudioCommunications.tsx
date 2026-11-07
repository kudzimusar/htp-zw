import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { services } from "../services";
import { useAsync } from "../hooks/useAsync";
import { colors, radius, spacing } from "../theme/tokens";
import {
  hasServerCapability,
  type AuthorizationSnapshot
} from "../security/capabilities";
import {
  ASSIGNMENT_STATUS_SEQUENCE,
  getNextAssignmentStatus,
  getAssignmentProgressActionLabel,
  type NewsroomAssignment
} from "../domain/models";

export {
  ASSIGNMENT_STATUS_SEQUENCE,
  getNextAssignmentStatus,
  getAssignmentProgressActionLabel
};

export function canProgressAssignment(
  snapshot: AuthorizationSnapshot | null | undefined,
  assignment: Pick<NewsroomAssignment, "status" | "reporterStaffId">
): boolean {
  if (!snapshot || snapshot.status !== "authorized" || snapshot.source !== "server") {
    return false;
  }
  if (assignment.status === "Complete" || !getNextAssignmentStatus(assignment.status)) {
    return false;
  }
  const isManager = hasServerCapability(snapshot, "assignment.manage");
  const isReporter = Boolean(
    snapshot.staffProfileId && snapshot.staffProfileId === assignment.reporterStaffId
  );
  return isManager || isReporter;
}

function LoadingOrError({loading,error}:{loading:boolean;error?:Error|null}){
  if(loading) return <Text style={styles.muted}>Loading server-authorized communications…</Text>;
  if(error) return <Text style={styles.error}>{error.message}</Text>;
  return null;
}

export type StudioAssignmentsViewProps = {
  assignments: NewsroomAssignment[];
  loading?: boolean;
  error?: Error | null;
  progressError?: string | null;
  progressConfirmation?: string | null;
  progressingId?: string | null;
  selectedAssignmentId?: string | null;
  onSelectAssignment?: (assignmentId: string | null) => void;
  canAdvanceAssignment: (item: NewsroomAssignment) => boolean;
  onAdvanceAssignment: (item: NewsroomAssignment) => void | Promise<void>;
  onOpenDiscussion: (assignmentId: string) => void;
  onOpenStory: (storyId: string) => void;
};

export function StudioAssignmentsView({
  assignments,
  loading = false,
  error = null,
  progressError = null,
  progressConfirmation = null,
  progressingId = null,
  selectedAssignmentId = null,
  onSelectAssignment,
  canAdvanceAssignment,
  onAdvanceAssignment,
  onOpenDiscussion,
  onOpenStory
}: StudioAssignmentsViewProps) {
  const [discussionInputs, setDiscussionInputs] = useState<Record<string, string>>({});
  const [discussionFeedbacks, setDiscussionFeedbacks] = useState<Record<string, string>>({});

  return (
    <View style={styles.stack}>
      <LoadingOrError loading={loading} error={error}/>
      {!!progressError&&<Text style={styles.error}>{progressError}</Text>}
      {!!progressConfirmation&&<Text style={styles.meta}>{progressConfirmation}</Text>}
      {assignments.map(item=>{
        const canAdvance=canAdvanceAssignment(item);
        const actionLabel=getAssignmentProgressActionLabel(item.status);
        const nextStatus=getNextAssignmentStatus(item.status);
        const isAdvancing=progressingId===item.id;
        const isTargeted = item.id === selectedAssignmentId;
        const currentInput = discussionInputs[item.id] ?? "";
        const currentFeedback = discussionFeedbacks[item.id] ?? "";

        return (
          <View
            key={item.id}
            style={[styles.card, isTargeted && styles.cardTargeted]}
            testID={isTargeted ? "targeted-assignment-card" : undefined}
          >
            {isTargeted && (
              <View style={styles.targetedPill} testID="targeted-assignment-pill">
                <Text style={styles.targetedPillText}>🎯 TARGETED ASSIGNMENT · FOCUSED DISCUSSION</Text>
              </View>
            )}
            <View style={styles.row}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.badge}>{item.status.toUpperCase()}</Text>
            </View>
            <Text style={styles.meta}>{item.desk??"Unassigned desk"} · {item.priority}</Text>
            {!!item.deadlineAt&&<Text style={styles.meta}>Deadline {new Date(item.deadlineAt).toLocaleString()}</Text>}
            {!!item.notes&&<Text style={styles.muted}>{item.notes}</Text>}
            <View style={styles.actions}>
              {canAdvance&&actionLabel&&nextStatus&&(
                <Pressable
                  style={styles.primary}
                  onPress={()=>void onAdvanceAssignment(item)}
                  disabled={isAdvancing}
                >
                  <Text style={styles.primaryText}>
                    {isAdvancing?"Advancing…":`${actionLabel} → ${nextStatus}`}
                  </Text>
                </Pressable>
              )}
              <Pressable
                style={[styles.secondary, isTargeted && styles.secondaryActive]}
                onPress={() => {
                  if (onSelectAssignment) {
                    onSelectAssignment(isTargeted ? null : item.id);
                  }
                  onOpenDiscussion(item.id);
                }}
              >
                <Text style={[styles.secondaryText, isTargeted && styles.secondaryActiveText]}>
                  {isTargeted ? "Hide Discussion" : "Open Discussion"}
                </Text>
              </Pressable>
              {!!item.storyId&&(
                <Pressable
                  style={styles.secondary}
                  onPress={()=>onOpenStory(item.storyId!)}
                >
                  <Text style={styles.secondaryText}>Open Story</Text>
                </Pressable>
              )}
            </View>

            {isTargeted && (
              <View style={styles.discussionBox} testID="assignment-targeted-discussion">
                <Text style={styles.discussionTitle}>Internal Assignment Discussion</Text>
                <Text style={styles.discussionSubtitle}>Direct editorial coordination for "{item.title}"</Text>
                <View style={styles.discussionThread}>
                  <View style={styles.discussionMsg}>
                    <Text style={styles.msgAuthor}>Preview Assignment Editor</Text>
                    <Text style={styles.msgText}>Please confirm field verification logs and check ORS buffer stocks before draft filing.</Text>
                    <Text style={styles.msgTime}>Today 09:15 · Preview Persona</Text>
                  </View>
                  <View style={[styles.discussionMsg, styles.msgSelf]}>
                    <Text style={styles.msgAuthor}>Assigned Reporter (Current Persona)</Text>
                    <Text style={styles.msgText}>Field inspection underway. Municipal water testing logs obtained; filing initial reporting notes.</Text>
                    <Text style={styles.msgTime}>Today 10:30 · Local Preview State</Text>
                  </View>
                </View>
                <View style={styles.discussionComposer}>
                  <TextInput
                    style={styles.discussionInput}
                    placeholder="Post note to assignment discussion (local preview)..."
                    placeholderTextColor={colors.inkMuted}
                    value={currentInput}
                    onChangeText={(val) => setDiscussionInputs((prev) => ({ ...prev, [item.id]: val }))}
                  />
                  <Pressable
                    style={styles.discussionSendBtn}
                    onPress={() => {
                      if (!currentInput.trim()) return;
                      setDiscussionFeedbacks((prev) => ({
                        ...prev,
                        [item.id]: "Note added to assignment discussion in local Preview memory (writes disabled)."
                      }));
                      setDiscussionInputs((prev) => ({ ...prev, [item.id]: "" }));
                    }}
                  >
                    <Text style={styles.discussionSendText}>Post</Text>
                  </Pressable>
                </View>
                {currentFeedback ? (
                  <Text style={styles.discussionFeedbackText}>{currentFeedback}</Text>
                ) : null}
              </View>
            )}
          </View>
        );
      })}
      {!loading&&!assignments.length&&<Text style={styles.muted}>No assignments found.</Text>}
    </View>
  );
}

export function StudioAssignmentsPanel(){
  const router=useRouter();
  const [refresh,setRefresh]=useState(0);
  const [progressingId,setProgressingId]=useState<string|null>(null);
  const [progressError,setProgressError]=useState<string|null>(null);
  const [progressConfirmation,setProgressConfirmation]=useState<string|null>(null);
  const authorization=useAsync(()=>services.authorization.getSnapshot(),[refresh]);
  const assignments=useAsync(()=>services.newsroomCommunication.listAssignments(),[refresh]);
  const authSnapshot=authorization.data;

  const advance=async(item:NewsroomAssignment)=>{
    if(!canProgressAssignment(authSnapshot,item)) return;
    const nextStatus=getNextAssignmentStatus(item.status);
    if(!nextStatus) return;
    try{
      setProgressingId(item.id);
      setProgressError(null);
      setProgressConfirmation(null);
      const serverNext=await services.newsroomCommunication.progressAssignment(item.id);
      setProgressConfirmation(`Assignment advanced to ${serverNext}.`);
      setRefresh(value=>value+1);
    }catch(error){
      setProgressError(error instanceof Error?error.message:"Assignment status could not be progressed.");
    }finally{
      setProgressingId(null);
    }
  };

  return StudioAssignmentsView({
    assignments: assignments.data ?? [],
    loading: assignments.loading || authorization.loading,
    error: assignments.error || authorization.error,
    progressError,
    progressConfirmation,
    progressingId,
    canAdvanceAssignment: (item) => canProgressAssignment(authSnapshot, item),
    onAdvanceAssignment: advance,
    onOpenDiscussion: (assignmentId) =>
      router.push({
        pathname: "/studio/assignments",
        params: { assignmentId }
      } as never),
    onOpenStory: (storyId) =>
      router.push({
        pathname: "/studio/[module]",
        params: { module: "create-edit", storyId }
      } as never)
  });
}

export function StudioAssignmentDiscussionPanel({assignmentId}:{assignmentId:string}){
  const [refresh,setRefresh]=useState(0);
  const [status,setStatus]=useState("");
  const assignments=useAsync(()=>services.newsroomCommunication.listAssignments(),[assignmentId]);
  const threads=useAsync(()=>services.newsroomCommunication.listThreads({threadType:"assignment"}),[assignmentId,refresh]);
  const assignment=(assignments.data??[]).find(item=>item.id===assignmentId);
  const thread=(threads.data??[]).find(item=>item.assignmentId===assignmentId&&item.status==="open");
  const start=async()=>{
    if(!assignment)return;
    try{
      await services.newsroomCommunication.createThread({
        threadType:"assignment",
        title:assignment.title+" discussion",
        assignmentId,
        priority:assignment.priority.toLowerCase()==="urgent"?"urgent":assignment.priority.toLowerCase()==="high"?"high":"normal"
      });
      setStatus("");setRefresh(value=>value+1);
    }catch(error){setStatus(error instanceof Error?error.message:"Assignment discussion could not be started.");}
  };
  if(assignments.loading||threads.loading){
    return <View style={styles.panel}><LoadingOrError loading={true}/></View>;
  }
  if(assignments.error||threads.error){
    return <View style={styles.panel}><LoadingOrError loading={false} error={assignments.error??threads.error}/></View>;
  }
  if(!assignment) return <Text style={styles.muted}>Assignment is not available to this server-authorized session.</Text>;
  if(thread) return <StudioThreadPanel threadId={thread.id}/>;
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{assignment.title}</Text>
      <Text style={styles.muted}>No coordination thread exists yet. Starting one preserves the authoritative assignment row and creates only its discussion thread.</Text>
      <Pressable style={styles.primary} onPress={()=>void start()}><Text style={styles.primaryText}>Start assignment discussion</Text></Pressable>
      {!!status&&<Text style={styles.error}>{status}</Text>}
    </View>
  );
}

export function StudioDesksPanel(){
  const router=useRouter();
  const desks=useAsync(()=>services.newsroomCommunication.listDesks(),[]);
  const threads=useAsync(()=>services.newsroomCommunication.listThreads({threadType:"desk"}),[]);
  if(desks.loading||desks.error) return <View style={styles.panel}><LoadingOrError loading={desks.loading} error={desks.error}/></View>;
  return (
    <View style={styles.stack}>
      {(desks.data??[]).map(desk=>{
        const count=(threads.data??[]).filter(thread=>thread.deskId===desk.id&&thread.status==="open").length;
        return (
          <Pressable key={desk.id} style={styles.card} onPress={()=>router.push({pathname:"/studio/desks",params:{deskId:desk.id}} as never)}>
            <Text style={styles.cardTitle}>{desk.name}</Text>
            {!!desk.description&&<Text style={styles.muted}>{desk.description}</Text>}
            <Text style={styles.meta}>{count} open coordination thread{count===1?"":"s"}</Text>
          </Pressable>
        );
      })}
      {!(desks.data??[]).length&&<Text style={styles.muted}>No desks are available to this authorized session.</Text>}
    </View>
  );
}

export function StudioDeskThreadsPanel({deskId}:{deskId:string}){
  const threads=useAsync(()=>services.newsroomCommunication.listThreads({deskId,threadType:"desk"}),[deskId]);
  const [title,setTitle]=useState("");
  const [status,setStatus]=useState("");
  const [refresh,setRefresh]=useState(0);
  const refreshed=useAsync(()=>services.newsroomCommunication.listThreads({deskId,threadType:"desk"}),[deskId,refresh]);
  const rows=refresh?refreshed:threads;
  const create=async()=>{
    const value=title.trim();if(!value)return;
    try{
      await services.newsroomCommunication.createThread({threadType:"desk",title:value,deskId});
      setTitle("");setStatus("Desk thread created.");setRefresh(value=>value+1);
    }catch(error){setStatus(error instanceof Error?error.message:"Desk thread could not be created.");}
  };
  return (
    <View style={styles.stack}>
      <View style={styles.composer}>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="New desk coordination thread" />
        <Pressable style={styles.primary} onPress={()=>void create()}><Text style={styles.primaryText}>Create</Text></Pressable>
      </View>
      {!!status&&<Text style={styles.meta}>{status}</Text>}
      <LoadingOrError loading={rows.loading} error={rows.error}/>
      {(rows.data??[]).map(thread=><StudioThreadCard key={thread.id} thread={thread} destination="desks" />)}
    </View>
  );
}

function StudioThreadCard({thread,destination}:{thread:{id:string;title:string;threadType:string;priority:string;status:string;updatedAt:string};destination:"desks"|"breaking"}){
  const router=useRouter();
  return (
    <Pressable style={styles.card} onPress={()=>router.push({pathname:destination==="desks"?"/studio/desks":"/studio/breaking",params:{threadId:thread.id}} as never)}>
      <View style={styles.row}>
        <Text style={styles.cardTitle}>{thread.title}</Text>
        <Text style={styles.badge}>{thread.priority.toUpperCase()}</Text>
      </View>
      <Text style={styles.meta}>{thread.threadType} · {thread.status} · {thread.updatedAt?new Date(thread.updatedAt).toLocaleString():""}</Text>
    </Pressable>
  );
}

export function StudioBreakingPanel(){
  const rows=useAsync(()=>services.newsroomCommunication.listThreads({threadType:"breaking"}),[]);
  return (
    <View style={styles.stack}>
      <LoadingOrError loading={rows.loading} error={rows.error}/>
      {(rows.data??[]).filter(thread=>thread.status==="open").map(thread=><StudioThreadCard key={thread.id} thread={thread} destination="breaking" />)}
      {!rows.loading&&!(rows.data??[]).filter(thread=>thread.status==="open").length&&<Text style={styles.muted}>No active breaking rooms.</Text>}
    </View>
  );
}

export function StudioThreadPanel({threadId}:{threadId:string}){
  const [refresh,setRefresh]=useState(0);
  const [message,setMessage]=useState("");
  const [status,setStatus]=useState("");
  const messages=useAsync(()=>services.newsroomCommunication.listThreadMessages(threadId),[threadId,refresh]);
  useEffect(()=>{void services.newsroomCommunication.markThreadRead(threadId).catch(()=>{});},[threadId,refresh]);
  const send=async()=>{
    const value=message.trim();if(!value)return;
    try{
      await services.newsroomCommunication.postThreadMessage(threadId,value);
      setMessage("");setStatus("");setRefresh(value=>value+1);
    }catch(error){setStatus(error instanceof Error?error.message:"Message could not be sent.");}
  };
  return (
    <View style={styles.stack}>
      <LoadingOrError loading={messages.loading} error={messages.error}/>
      {(messages.data??[]).map(item=>(
        <View key={item.id} style={styles.message}>
          <Text style={styles.messageAuthor}>{item.authorStaffId}</Text>
          <Text style={styles.messageBody}>{item.body}</Text>
          <Text style={styles.meta}>{item.createdAt?new Date(item.createdAt).toLocaleString():""}</Text>
        </View>
      ))}
      <View style={styles.composer}>
        <TextInput multiline style={[styles.input,styles.textarea]} value={message} onChangeText={setMessage} placeholder="Message this private room" />
        <Pressable style={styles.primary} onPress={()=>void send()}><Text style={styles.primaryText}>Send</Text></Pressable>
      </View>
      {!!status&&<Text style={styles.error}>{status}</Text>}
    </View>
  );
}

export function StudioStoryDiscussionPanel({storyId}:{storyId:string}){
  const [refresh,setRefresh]=useState(0);
  const [message,setMessage]=useState("");
  const [status,setStatus]=useState("");
  const comments=useAsync(()=>services.newsroomCommunication.listStoryDiscussion(storyId),[storyId,refresh]);
  const send=async()=>{
    const value=message.trim();if(!value)return;
    try{
      await services.newsroomCommunication.addStoryComment(storyId,value);
      setMessage("");setStatus("");setRefresh(value=>value+1);
    }catch(error){setStatus(error instanceof Error?error.message:"Internal comment could not be posted.");}
  };
  return (
    <View style={styles.stack}>
      <LoadingOrError loading={comments.loading} error={comments.error}/>
      {(comments.data??[]).map(item=>(
        <View key={item.id} style={styles.message}>
          <View style={styles.row}><Text style={styles.messageAuthor}>{item.authorStaffId}</Text>{!!item.resolvedAt&&<Text style={styles.badge}>RESOLVED</Text>}</View>
          <Text style={styles.messageBody}>{item.body}</Text>
          <Text style={styles.meta}>{item.createdAt?new Date(item.createdAt).toLocaleString():""}{item.editedAt?" · edited":""}</Text>
        </View>
      ))}
      <View style={styles.composer}>
        <TextInput multiline style={[styles.input,styles.textarea]} value={message} onChangeText={setMessage} placeholder="Add a private editorial note" />
        <Pressable style={styles.primary} onPress={()=>void send()}><Text style={styles.primaryText}>Post</Text></Pressable>
      </View>
      {!!status&&<Text style={styles.error}>{status}</Text>}
    </View>
  );
}

export function StudioModerationPanel(){
  const [refresh,setRefresh]=useState(0);
  const [status,setStatus]=useState("");
  const queue=useAsync(()=>services.commentModeration.listQueue(null,50),[refresh]);
  const act=async(commentId:string,action:"publish"|"hold"|"reject"|"hide"|"remove"|"restore")=>{
    try{
      await services.commentModeration.moderate(commentId,action,"native_editorial_review");
      setStatus("");setRefresh(value=>value+1);
    }catch(error){setStatus(error instanceof Error?error.message:"Moderation action failed.");}
  };
  return (
    <View style={styles.stack}>
      <LoadingOrError loading={queue.loading} error={queue.error}/>
      {(queue.data??[]).map(item=>(
        <View key={item.id} style={styles.card}>
          <View style={styles.row}><Text style={styles.badge}>{item.state}</Text><Text style={styles.meta}>{item.riskFlags.join(", ")||"No automated risk flags"}</Text></View>
          <Text style={styles.messageBody}>{item.body}</Text>
          <View style={styles.actions}>
            {item.state!=="PUBLISHED"&&item.state!=="REMOVED"&&<Pressable style={styles.secondary} onPress={()=>void act(item.id,"publish")}><Text style={styles.secondaryText}>Publish</Text></Pressable>}
            {item.state==="PENDING"&&<Pressable style={styles.secondary} onPress={()=>void act(item.id,"hold")}><Text style={styles.secondaryText}>Hold</Text></Pressable>}
            {item.state==="PUBLISHED"&&<Pressable style={styles.secondary} onPress={()=>void act(item.id,"hide")}><Text style={styles.secondaryText}>Hide</Text></Pressable>}
            {item.state!=="REMOVED"&&<Pressable style={styles.secondary} onPress={()=>void act(item.id,"remove")}><Text style={styles.secondaryText}>Remove</Text></Pressable>}
          </View>
        </View>
      ))}
      {!queue.loading&&!(queue.data??[]).length&&<Text style={styles.muted}>Moderation queue is clear.</Text>}
      {!!status&&<Text style={styles.error}>{status}</Text>}
    </View>
  );
}

const styles=StyleSheet.create({
  panel:{marginTop:spacing.lg,backgroundColor:"#FFFFFF",borderWidth:1,borderColor:colors.border,borderRadius:radius.md,padding:spacing.lg},
  stack:{marginTop:spacing.lg,gap:spacing.md},
  card:{backgroundColor:"#FFFFFF",borderWidth:1,borderColor:colors.border,borderRadius:radius.md,padding:spacing.lg,gap:spacing.sm},
  cardTitle:{fontSize:16,fontWeight:"900",color:colors.ink,flex:1},
  muted:{fontSize:13,lineHeight:20,color:colors.inkMuted},
  error:{fontSize:13,lineHeight:20,color:colors.live},
  meta:{fontSize:11,lineHeight:17,color:colors.inkMuted},
  row:{flexDirection:"row",alignItems:"center",gap:spacing.sm,flexWrap:"wrap"},
  badge:{fontSize:9,fontWeight:"900",letterSpacing:.7,color:colors.blue},
  message:{backgroundColor:"#FFFFFF",borderWidth:1,borderColor:colors.border,borderRadius:radius.md,padding:spacing.lg,gap:spacing.xs},
  messageAuthor:{fontSize:11,fontWeight:"900",color:colors.blue},
  messageBody:{fontSize:14,lineHeight:21,color:colors.ink},
  composer:{backgroundColor:"#FFFFFF",borderWidth:1,borderColor:colors.border,borderRadius:radius.md,padding:spacing.lg,gap:spacing.sm},
  input:{minHeight:44,borderWidth:1,borderColor:colors.border,borderRadius:radius.sm,paddingHorizontal:12,fontSize:14,color:colors.ink,backgroundColor:"#FFFFFF"},
  textarea:{minHeight:96,paddingTop:12,textAlignVertical:"top"},
  primary:{minHeight:44,alignSelf:"flex-start",justifyContent:"center",paddingHorizontal:16,backgroundColor:colors.blue,borderRadius:radius.sm},
  primaryText:{fontSize:12,fontWeight:"900",color:"#FFFFFF"},
  secondary:{minHeight:38,justifyContent:"center",paddingHorizontal:12,borderWidth:1,borderColor:colors.border,borderRadius:radius.sm},
  secondaryText:{fontSize:11,fontWeight:"900",color:colors.ink},
  actions:{flexDirection:"row",gap:spacing.sm,flexWrap:"wrap"},
  cardTargeted:{borderColor:colors.blue,borderWidth:2,backgroundColor:"#F4F8FD"},
  targetedPill:{backgroundColor:colors.blue,paddingHorizontal:8,paddingVertical:4,borderRadius:4,alignSelf:"flex-start"},
  targetedPillText:{color:"#FFFFFF",fontSize:10,fontWeight:"900",letterSpacing:0.5},
  secondaryActive:{backgroundColor:colors.blue,borderColor:colors.blue},
  secondaryActiveText:{color:"#FFFFFF"},
  discussionBox:{marginTop:spacing.md,backgroundColor:"#FFFFFF",borderWidth:1,borderColor:colors.border,borderRadius:radius.sm,padding:spacing.md,gap:spacing.sm},
  discussionTitle:{fontSize:13,fontWeight:"800",color:colors.ink},
  discussionSubtitle:{fontSize:11,color:colors.inkMuted},
  discussionThread:{gap:spacing.xs,marginVertical:spacing.xs},
  discussionMsg:{backgroundColor:colors.paperMuted,padding:spacing.sm,borderRadius:radius.sm},
  msgSelf:{backgroundColor:"#E8F5E9"},
  msgAuthor:{fontSize:10,fontWeight:"800",color:colors.blue},
  msgText:{fontSize:12,color:colors.ink,marginTop:2},
  msgTime:{fontSize:9,color:colors.inkMuted,marginTop:2},
  discussionComposer:{flexDirection:"row",gap:spacing.xs,marginTop:spacing.xs},
  discussionInput:{flex:1,minHeight:36,borderWidth:1,borderColor:colors.border,borderRadius:radius.sm,paddingHorizontal:8,fontSize:12,color:colors.ink,backgroundColor:"#FFFFFF"},
  discussionSendBtn:{backgroundColor:colors.blue,paddingHorizontal:12,justifyContent:"center",borderRadius:radius.sm},
  discussionSendText:{color:"#FFFFFF",fontSize:11,fontWeight:"800"},
  discussionFeedbackText:{fontSize:11,color:colors.teal,fontStyle:"italic"}
});
