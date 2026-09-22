import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { services } from "../services";
import type { ReaderCommentEligibility, ReaderStoryComment } from "../domain/models";
import { colors, radius, spacing } from "../theme/tokens";

type Props={canonicalStoryId:string|null};

export function ReaderDiscussionPanel({canonicalStoryId}:Props){
  const [comments,setComments]=useState<ReaderStoryComment[]>([]);
  const [eligibility,setEligibility]=useState<ReaderCommentEligibility|null>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [displayName,setDisplayName]=useState("");
  const [body,setBody]=useState("");
  const [parentId,setParentId]=useState<string|null>(null);

  const canonical=Boolean(canonicalStoryId);
  const roots=useMemo(()=>comments.filter(comment=>!comment.parentCommentId),[comments]);

  const refresh=async()=>{
    if(!canonicalStoryId) return;
    setLoading(true);
    setError("");
    try{
      const [publicRows,nextEligibility]=await Promise.all([
        services.readerDiscussion.listPublic(canonicalStoryId),
        services.readerDiscussion.getEligibility(canonicalStoryId)
      ]);
      setComments(publicRows);
      setEligibility(nextEligibility);
    }catch(e){
      setError(e instanceof Error ? e.message : "Discussion is unavailable.");
    }finally{
      setLoading(false);
    }
  };

  useEffect(()=>{void refresh();},[canonicalStoryId]);

  if(!canonical){
    return (
      <View style={styles.panel}>
        <Text style={styles.title}>Discussion</Text>
        <Text style={styles.muted}>
          Reader discussion is unavailable on this source-parity or fixture story because no canonical HealthTimes story identity is certified yet.
        </Text>
      </View>
    );
  }

  const setupProfile=async()=>{
    if(displayName.trim().length<2) return;
    setError("");
    try{
      await services.readerDiscussion.registerProfile(displayName.trim());
      setDisplayName("");
      await refresh();
    }catch(e){
      setError(e instanceof Error ? e.message : "Comment profile could not be created.");
    }
  };

  const submit=async()=>{
    if(!canonicalStoryId || !body.trim()) return;
    setError("");
    try{
      await services.readerDiscussion.submit(canonicalStoryId,body.trim(),parentId);
      setBody("");
      setParentId(null);
      await refresh();
    }catch(e){
      setError(e instanceof Error ? e.message : "Comment could not be submitted.");
    }
  };

  const report=async(commentId:string)=>{
    setError("");
    try{
      await services.readerDiscussion.report(commentId,"reader_report",null);
      setError("Report received for moderation.");
    }catch(e){
      setError(e instanceof Error ? e.message : "Report could not be submitted.");
    }
  };

  const renderComment=(comment:ReaderStoryComment)=>{
    const children=comments.filter(row=>row.parentCommentId===comment.id);
    return (
      <View key={comment.id} style={styles.comment}>
        <View style={styles.commentHeader}>
          <Text style={styles.author}>{comment.displayName}</Text>
          <Text style={styles.meta}>{comment.edited ? "Edited" : ""}</Text>
        </View>
        <Text style={styles.body}>{comment.body}</Text>
        <View style={styles.actions}>
          <Pressable onPress={()=>setParentId(comment.id)}><Text style={styles.action}>Reply</Text></Pressable>
          <Pressable onPress={()=>{void report(comment.id);}}><Text style={styles.action}>Report</Text></Pressable>
        </View>
        {children.length>0 && <View style={styles.replies}>{children.map(renderComment)}</View>}
      </View>
    );
  };

  const profileRequired=eligibility?.reason==="comment_profile_required";
  const canWrite=eligibility?.status==="allowed" || eligibility?.status==="pre_moderated";

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>Discussion</Text>
      <Text style={styles.muted}>Verified HealthTimes accounts only. Comments may be held for moderation.</Text>

      {loading && <Text style={styles.muted}>Loading discussion…</Text>}
      {!!error && <Text style={styles.status}>{error}</Text>}

      {roots.length>0 ? <View style={styles.list}>{roots.map(renderComment)}</View> : <Text style={styles.muted}>No published comments yet.</Text>}

      {profileRequired && (
        <View style={styles.composer}>
          <Text style={styles.label}>Create your comment profile</Text>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Display name"
            autoCapitalize="words"
            style={styles.input}
          />
          <Pressable style={styles.primary} onPress={()=>{void setupProfile();}}><Text style={styles.primaryText}>Create profile</Text></Pressable>
        </View>
      )}

      {canWrite && (
        <View style={styles.composer}>
          <Text style={styles.label}>{parentId ? "Reply to this discussion" : "Add a comment"}</Text>
          {eligibility?.status==="pre_moderated" && <Text style={styles.muted}>Your comment will be reviewed before publication.</Text>}
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Write a respectful, relevant comment"
            multiline
            maxLength={4000}
            style={[styles.input,styles.textarea]}
          />
          <View style={styles.actions}>
            <Pressable style={styles.primary} onPress={()=>{void submit();}}><Text style={styles.primaryText}>Submit</Text></Pressable>
            {parentId && <Pressable onPress={()=>setParentId(null)}><Text style={styles.action}>Cancel reply</Text></Pressable>}
          </View>
        </View>
      )}

      {eligibility?.status==="blocked" && !profileRequired && (
        <Text style={styles.muted}>Commenting is currently unavailable for this account or story.</Text>
      )}
    </View>
  );
}

const styles=StyleSheet.create({
  panel:{marginTop:spacing.xl,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,padding:spacing.lg,gap:spacing.md,backgroundColor:"#FFFFFF"},
  title:{fontSize:22,fontWeight:"900",color:colors.ink},
  muted:{fontSize:12,lineHeight:18,color:colors.inkMuted},
  status:{fontSize:12,lineHeight:18,color:colors.warning,fontWeight:"700"},
  list:{gap:spacing.md},
  comment:{borderTopWidth:1,borderTopColor:colors.border,paddingTop:spacing.md,gap:spacing.xs},
  commentHeader:{flexDirection:"row",justifyContent:"space-between",gap:spacing.sm},
  author:{fontSize:13,fontWeight:"900",color:colors.ink},
  meta:{fontSize:10,color:colors.inkMuted},
  body:{fontSize:14,lineHeight:21,color:colors.ink},
  replies:{marginLeft:spacing.lg,borderLeftWidth:2,borderLeftColor:colors.border,paddingLeft:spacing.md,gap:spacing.md},
  actions:{flexDirection:"row",alignItems:"center",gap:spacing.md,flexWrap:"wrap"},
  action:{fontSize:12,fontWeight:"800",color:colors.blue},
  composer:{borderTopWidth:1,borderTopColor:colors.border,paddingTop:spacing.md,gap:spacing.sm},
  label:{fontSize:12,fontWeight:"900",color:colors.ink},
  input:{minHeight:44,borderWidth:1,borderColor:colors.border,borderRadius:radius.sm,paddingHorizontal:12,paddingVertical:10,fontSize:14,color:colors.ink,backgroundColor:"#FFFFFF"},
  textarea:{minHeight:100,textAlignVertical:"top"},
  primary:{minHeight:44,alignSelf:"flex-start",justifyContent:"center",backgroundColor:colors.blue,paddingHorizontal:16,borderRadius:radius.sm},
  primaryText:{color:"#FFFFFF",fontWeight:"900"}
});
