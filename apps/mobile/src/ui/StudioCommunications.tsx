import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { services } from "../services";
import { useAsync } from "../hooks/useAsync";
import { colors, radius, spacing } from "../theme/tokens";

function LoadingOrError({loading,error}:{loading:boolean;error?:Error|null}){
  if(loading) return <Text style={styles.muted}>Loading server-authorized communications…</Text>;
  if(error) return <Text style={styles.error}>{error.message}</Text>;
  return null;
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
      {(rows.data??[]).map(thread)=><StudioThreadCard key={thread.id} thread={thread}/>)}
    </View>
  );
}

function StudioThreadCard({thread}:{thread:{id:string;title:string;threadType:string;priority:string;status:string;updatedAt:string}}){
  const router=useRouter();
  return (
    <Pressable style={styles.card} onPress={()=>router.push({pathname:"/studio/breaking",params:{threadId:thread.id}} as never)}>
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
      {(rows.data??[]).filter(thread=>thread.status==="open").map(thread)=><StudioThreadCard key={thread.id} thread={thread}/>)}
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
  actions:{flexDirection:"row",gap:spacing.sm,flexWrap:"wrap"}
});
