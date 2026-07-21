import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList
} from "react-native";
import { useEffect, useState } from "react";
import axios from "axios";

const API = "http://YOUR_COMPUTER_IP:3000";

export default function App() {
  const [title, setTitle] = useState("");
  const [world, setWorld] = useState<{traces:any[]}>({ traces: [] });

  async function refresh() {
    const { data } = await axios.get(`${API}/world`);
    setWorld(data);
  }

  async function createTrace() {
    if (!title.trim()) return;

    await axios.post(`${API}/trace`, {
      title,
      author: "human"
    });

    setTitle("");
    refresh();
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <SafeAreaView style={styles.container}>

      <View style={styles.core}>
        <View style={styles.coreGlow}/>
        <Text style={styles.coreText}>VOLT</Text>
      </View>

      <TextInput
        placeholder="Create a Trace..."
        placeholderTextColor="#666"
        style={styles.input}
        value={title}
        onChangeText={setTitle}
      />

      <Pressable
        style={styles.button}
        onPress={createTrace}
      >
        <Text style={styles.buttonText}>Commit</Text>
      </Pressable>

      <FlatList
        data={world.traces}
        keyExtractor={(item)=>item.id}
        renderItem={({item})=>(
          <View style={styles.trace}>
            <Text style={styles.traceTitle}>
              {item.title}
            </Text>

            <Text style={styles.weight}>
              ⚡ {item.weight}
            </Text>
          </View>
        )}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({

container:{
flex:1,
backgroundColor:"#050505",
padding:24
},

core:{
height:170,
justifyContent:"center",
alignItems:"center"
},

coreGlow:{
position:"absolute",
width:120,
height:120,
borderRadius:60,
backgroundColor:"#00ff66",
opacity:.28
},

coreText:{
color:"#00ff66",
fontSize:38,
fontWeight:"800",
letterSpacing:6
},

input:{
backgroundColor:"#111",
padding:16,
borderRadius:14,
color:"white",
marginBottom:16
},

button:{
backgroundColor:"#00ff66",
padding:16,
borderRadius:14,
alignItems:"center",
marginBottom:24
},

buttonText:{
fontWeight:"700",
fontSize:18
},

trace:{
backgroundColor:"#111",
padding:16,
borderRadius:14,
marginBottom:12,
flexDirection:"row",
justifyContent:"space-between"
},

traceTitle:{
color:"white",
fontSize:16
},

weight:{
color:"#00ff66",
fontWeight:"700"
}

});
