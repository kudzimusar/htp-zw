import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Chip, Page, Section, SectionHeader } from "../src/ui/Layout";
import { services } from "../src/services";
import { colors, layout, radius, spacing } from "../src/theme/tokens";

type Mode = "sign-in" | "register" | "recovery";

export default function AccountAccessScreen(){
  const [mode,setMode]=useState<Mode>("sign-in");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [displayName,setDisplayName]=useState("");
  const [status,setStatus]=useState("");

  const validEmail=email.trim().includes("@");
  const strongEnough=password.length>=8;

  const submit=async()=>{
    setStatus("");
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

  return (
    <Page title="Account Access">
      <Section>
        <View style={styles.tabs}>
          <Chip active={mode==="sign-in"} onPress={()=>setMode("sign-in")}>Sign in</Chip>
          <Chip active={mode==="register"} onPress={()=>setMode("register")}>Create reader account</Chip>
          <Chip active={mode==="recovery"} onPress={()=>setMode("recovery")}>Reset password</Chip>
        </View>
      </Section>

      <Section>
        <SectionHeader title={mode==="sign-in" ? "Sign in" : mode==="register" ? "Create reader account" : "Password recovery"} />
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
          {mode!=="recovery" && (
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry
              autoComplete={mode==="sign-in" ? "current-password" : "new-password"}
              style={styles.input}
              accessibilityLabel="Password"
            />
          )}
          <Pressable accessibilityRole="button" style={styles.primary} onPress={()=>void submit()}>
            <Text style={styles.primaryText}>
              {mode==="sign-in" ? "Sign in" : mode==="register" ? "Create account" : "Request reset"}
            </Text>
          </Pressable>
          {mode!=="sign-in" && (
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
