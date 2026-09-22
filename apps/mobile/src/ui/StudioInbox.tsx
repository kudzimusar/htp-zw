import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { services } from "../services";
import { useAsync } from "../hooks/useAsync";
import { colors, radius, spacing } from "../theme/tokens";

export function StudioInboxPanel(){
  const [version,setVersion]=useState(0);
  const inbox=useAsync(()=>services.newsroomCommunication.listInbox("all",50),[version]);

  const act=async(kind:"read"|"ack"|"archive",id:string)=>{
    if(kind==="read") await services.newsroomCommunication.markRead(id,true);
    if(kind==="ack") await services.newsroomCommunication.acknowledge(id);
    if(kind==="archive") await services.newsroomCommunication.archive(id);
    setVersion(value=>value+1);
  };

  if(inbox.loading){
    return <View style={styles.panel}><Text style={styles.muted}>Loading server-authorized Inbox…</Text></View>;
  }
  if(inbox.error){
    return <View style={styles.panel}><Text style={styles.error}>{inbox.error.message}</Text></View>;
  }

  const data=inbox.data;
  const items=data?.items ?? [];
  const summary=data?.summary;

  return (
    <View style={styles.wrap}>
      <View style={styles.metrics}>
        <Metric label="Unread" value={summary?.unreadTotal ?? 0} />
        <Metric label="Mentions" value={summary?.mentions ?? 0} />
        <Metric label="Urgent" value={summary?.urgent ?? 0} />
        <Metric label="Needs acknowledgement" value={summary?.unacknowledged ?? 0} />
      </View>
      <View style={styles.panel}>
        <Text style={styles.title}>Inbox</Text>
        <Text style={styles.muted}>Durable server notifications only. Realtime events never replace this read model.</Text>
        {items.length===0 ? <Text style={styles.empty}>Your Inbox is clear.</Text> : items.map(item=>(
          <View style={styles.row} key={item.id}>
            <View style={styles.copy}>
              <Text style={styles.itemTitle}>{item.category.toUpperCase()} · {item.eventType}</Text>
              <Text style={styles.meta}>{item.priority.toUpperCase()} · {item.readAt ? "READ" : "UNREAD"}</Text>
            </View>
            <View style={styles.actions}>
              {!item.readAt && <Action label="Read" onPress={()=>void act("read",item.id)} />}
              {item.requiresAck && !item.acknowledgedAt && <Action label="Acknowledge" onPress={()=>void act("ack",item.id)} />}
              <Action label="Archive" onPress={()=>void act("archive",item.id)} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function Metric({label,value}:{label:string;value:number}){
  return <View style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{value}</Text></View>;
}

function Action({label,onPress}:{label:string;onPress:()=>void}){
  return <Pressable style={styles.action} onPress={onPress}><Text style={styles.actionText}>{label}</Text></Pressable>;
}

const styles=StyleSheet.create({
  wrap:{gap:spacing.lg},
  metrics:{flexDirection:"row",flexWrap:"wrap",gap:spacing.sm},
  metric:{minWidth:150,flexGrow:1,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,padding:spacing.lg,backgroundColor:"#FFFFFF"},
  metricLabel:{fontSize:10,fontWeight:"900",color:colors.inkMuted,textTransform:"uppercase"},
  metricValue:{fontSize:26,fontWeight:"900",color:colors.ink,marginTop:4},
  panel:{borderWidth:1,borderColor:colors.border,borderRadius:radius.md,padding:spacing.lg,gap:spacing.md,backgroundColor:"#FFFFFF"},
  title:{fontSize:20,fontWeight:"900",color:colors.ink},
  muted:{fontSize:12,lineHeight:18,color:colors.inkMuted},
  error:{fontSize:12,lineHeight:18,color:colors.warning,fontWeight:"800"},
  empty:{fontSize:13,color:colors.inkMuted,paddingVertical:spacing.lg},
  row:{borderTopWidth:1,borderTopColor:colors.border,paddingTop:spacing.md,flexDirection:"row",gap:spacing.md,alignItems:"center",justifyContent:"space-between",flexWrap:"wrap"},
  copy:{flex:1,minWidth:220,gap:3},
  itemTitle:{fontSize:13,fontWeight:"900",color:colors.ink},
  meta:{fontSize:10,fontWeight:"700",color:colors.inkMuted},
  actions:{flexDirection:"row",gap:spacing.sm,flexWrap:"wrap"},
  action:{minHeight:38,justifyContent:"center",paddingHorizontal:12,borderWidth:1,borderColor:colors.border,borderRadius:radius.sm},
  actionText:{fontSize:11,fontWeight:"900",color:colors.blue}
});
