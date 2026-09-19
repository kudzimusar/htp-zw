import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import * as Linking from "expo-linking";
import { Chip, Page, Section, SectionHeader } from "../src/ui/Layout";
import { services } from "../src/services";
import { colors, layout, radius, spacing } from "../src/theme/tokens";

type Mode = "sign-in" | "register" | "recovery" | "new-password";

export default function AccountAccessScreen(){
  const [mode,setMode]=useState<Mode>("sign-in");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [displayName,setDisplayName]=useState("");
  const [status,setStatus]=useState("");

  const validEmail=email.trim().includes("@");
  const strongEnough=password.length>=8;

  useEffect(()=>{
    let active=true;

    const consume=async(url:string|null)=>{
      if(!url || !url.includes("account-access")) return;
      const result=await services.auth.handleAuthCallback(url);
      if(!active) return;
      setStatus(result.message);

      if(result.status==="success"){
        if(url.includes("mode=recovery")){
          setMode("new-password");
          setPassword("");
        }else{
          setMode("sign-in");
        }
      }
    };

    void Linking.getInitialURL().then(consume);
    const subscription=Linking.addEventListener("url",({url})=>{ void consume(url); });

    return ()=>{
      active=false;
      subscription.remove();
    };
  },[]);

  const submit=async()=>{
    setStatus("");

    if(mode==="new-password"){
      if(!strongEnough){
        setStatus("New password must be at least 8 characters.");
        return;
      }
      const result=await services.auth.completePasswordReset(password);
      setStatus(result.message);
      if(result.status==="success"){
        setPassword("");
        setMode("sign-in");
      }
      return;
    }

    if(!validEmail){
      setStatus("Enter a valid email address.");
      return;
    }

    if(mode==="recovery"){
      const result=await services.auth.requestPasswordReset(email.trim());
      setStatus(result.message);
      return;
    }

    if(!strongEnough){
      setStatus("Password must be at least 8 characters.");
      return;
    }

    const result=mode==="sign-in"
      ? await services.auth.signInWithPassword(email.trim(),password)
      : await services.auth.registerReader(email.trim(),password,displayName);
    setStatus(result.message);
  };

  const resend=async()=>{
    if(!validEmail){
      setStatus("Enter the account email first.");
      return;
    }
    const result=await services.auth.resendVerification(email.trim());
    setStatus(result.message);
  };

  const title=
    mode==="sign-in" ? "Sign in" :
    mode==="register" ? "Create reader account" :
    mode==="recovery" ? "Password recovery" :
    "Set a new password";

  return (
    <Page title="Account Access">
      <Section>
        <View style={styles.tabs}>
          <Chip active={mode==="sign-in"} onPress={()=>setMode("sign-in")}>Sign in</Chip>
          <Chip active={mode==="register"} onPress={()=>setMode("register")}>Create reader account</Chip>
          <Chip active={mode==="recovery" || mode==="new-password"} onPress={()=>setMode("recovery")}>Reset password</Chip>
        </View>
      </Section>

      <Section>
        <SectionHeader title={title} />
        <View style={styles.form}>
          {mode==="register" && (
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Display name"
              autoComplete="name"
              style={styles.input}
              accessibilityLabel="Display name"
            />
          )}

          {mode!=="new-password" && (
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              style={styles.input}
              accessibilityLabel="Email address"
            />
          )}

          {(mode==="sign-in" || mode==="register" || mode==="new-password") && (
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder={mode==="new-password" ? "New password" : "Password"}
              secureTextEntry
              autoComplete={mode==="sign-in" ? "current-password" : "new-password"}
              style={styles.input}
              accessibilityLabel={mode==="new-password" ? "New password" : "Password"}
            />
          )}

          <Pressable accessibilityRole="button" style={styles.primary} onPress={()=>void submit()}>
            <Text style={styles.primaryText}>
              {mode==="sign-in" ? "Sign in" :
               mode==="register" ? "Create account" :
               mode==="recovery" ? "Request reset" :
               "Set new password"}
            </Text>
          </Pressable>

          {mode==="register" && (
            <Pressable accessibilityRole="button" style={styles.secondary} onPress={()=>void resend()}>
              <Text style={styles.secondaryText}>Resend verification email</Text>
            </Pressable>
          )}

          {!!status && <Text accessibilityLiveRegion="polite" style={styles.status}>{status}</Text>}
        </View>
      </Section>

      <Section>
        <View style={styles.security}>
          <Text style={styles.securityTitle}>Reader identity is not Studio authority</Text>
          <Text style={styles.securityText}>
            A signed-in reader cannot grant themselves staff roles or publishing capabilities. Studio privileges require an AG-06 server-issued capability snapshot.
          </Text>
          <Text style={styles.securityText}>
            Email verification and password-recovery links return to this screen. Native sessions are persisted with SecureStore; web uses the compatible browser storage fallback.
          </Text>
        </View>
      </Section>
    </Page>
  );
}

const styles=StyleSheet.create({
  tabs:{flexDirection:"row",flexWrap:"wrap",gap:spacing.sm},
  form:{maxWidth:560,gap:spacing.md},
  input:{minHeight:52,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,paddingHorizontal:spacing.lg,fontSize:16,color:colors.ink,backgroundColor:"#FFFFFF"},
  primary:{minHeight:layout.touchMin,alignSelf:"flex-start",justifyContent:"center",paddingHorizontal:18,backgroundColor:colors.blue,borderRadius:radius.sm},
  primaryText:{color:"#FFFFFF",fontWeight:"900"},
  secondary:{minHeight:layout.touchMin,alignSelf:"flex-start",justifyContent:"center"},
  secondaryText:{color:colors.blue,fontWeight:"800"},
  status:{fontSize:13,lineHeight:20,color:colors.inkMuted},
  security:{borderLeftWidth:4,borderLeftColor:colors.blue,paddingLeft:spacing.lg,gap:spacing.sm,maxWidth:720},
  securityTitle:{fontSize:17,fontWeight:"900",color:colors.ink},
  securityText:{fontSize:14,lineHeight:22,color:colors.inkMuted}
});
