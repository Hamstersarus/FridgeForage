import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, FlatList, TextInput, Button, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {findRecipes } from './recipes';

export default function App() {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [recipes, setRecipes]  = useState([]);

  useEffect(() => {
    const load = async () => {
      const saved = await AsyncStorage.getItem('items');
      if(saved) {
        setItems(JSON.parse(saved));
      }
      setLoaded(true);
    };
    load();
  }, []);

  useEffect(() => {
    if(!loaded) {
      return;
    }
    AsyncStorage.setItem('items', JSON.stringify(items));
  }, [items, loaded]);
  
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState(null);

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;

    const result = await ImagePicker.launchCameraAsync({ quality: 0.5 });
    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
    
  };

  const addItem = () => {
    if (text.trim() === '') {
      alert('Type a name first');
      return;
    }
    const newItem = {
      id: Date.now().toString(),
      name: text.trim(),
      perishable: false,
      photo: photo,
    };
    setItems([...items, newItem]);
    setText('');
    setPhoto(null);
  };

  const togglePerishable = (id) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, perishable: !item.perishable } : item
      )
    );
  };

  const deleteItem = (id) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const searchRecipes = async () => {
    if (items.length === 0) {
      alert('Add some ingredients first');
      return;
    }
    try {
      const results = await findRecipes(items.map((item) => item.name));
      setRecipes(results);
    } catch (e) {
      alert('Could not load recipes. Check your internet connection.');
    }
  };

  

  return (
    <View style={styles.container}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Add an ingredient"
        style={{ borderWidth: 1, borderColor: '#999', padding: 10, width: 250, borderRadius: 6}}
        />
        <Button title="Take photo" onPress={takePhoto} />
        {photo && <Image source={{ uri: photo}} style={{ width: 80, height: 80 }} />}
        <Button title="Add" onPress={addItem} />
        <FlatList
          style={{ flexGrow: 0}}
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap:8}}>
              {item.photo && (
                <Image source={{ uri: item.photo }} style={{ width: 50, height: 50 }} />
              )}
              <Text onPress={() => togglePerishable(item.id)}>
                {item.name} {item.perishable ? '(perishable)' : ''}
              </Text>
              <Button title="Delete" onPress={() => deleteItem(item.id)} />
            </View>
          )}
        />
        <Button title="Find recipes" onPress={searchRecipes} />
        <FlatList
          style={{ flexGrow: 0 }}
          data={recipes}
          keyExtractor={(r) => r.idMeal}
          renderItem={({ item }) => (
            <Text>{item.strMeal} (uses {item.matches} of your ingredients)</Text>
          )}
        />
        <StatusBar style="auto" />
      </View>
    );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
});
