import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, FlatList, TextInput, Button, Image, Modal, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { findRecipes, getRecipe } from './recipes';
import { convert } from './convert';

export default function App() {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [recipes, setRecipes]  = useState([]);
  const [selected, setSelected] = useState(null);
  const [showConverter, setShowConverter] = useState(false);
  const [amountText, setAmountText] = useState('1');
  const [fromUnit, setFromUnit] = useState('cup');
  const [toUnit, setToUnit] = useState('tbsp');

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

  const openRecipe = async (id) => {
    try {
      const recipe = await getRecipe(id);
      setSelected(recipe);
    } catch(e) {
      alert('Could not load that recipe.');
    }
  };

  const UNITS = ['tsp', 'tbsp', 'fl oz', 'cup', 'ml', 'l', 'oz', 'lb', 'g', 'kg'];

  const converted = convert(parseFloat(amountText), fromUnit, toUnit);
  const resultText =
    isNaN(parseFloat(amountText)) ? '' :
    converted === null ? "Can't convert those units" :
    `${Math.round(converted * 100) / 100} ${toUnit}`;

  const UnitPicker = ({ value, onChange }) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {UNITS.map((u) => (
        <Text
          key={u}
          onPress={() => onChange(u)}
          style={{
            padding: 8,
            borderWidth: 1,
            borderRadius: 6,
            backgroundColor: u === value ? '#cde' : '#fff',
          }}>
          {u}
          </Text>
      ))}
    </View>
  );

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
        <Button title="Converter" onPress={() => setShowConverter(true)} />
        <FlatList
          style={{ flexGrow: 0 }}
          data={recipes}
          keyExtractor={(r) => r.idMeal}
          renderItem={({ item }) => (
            <Text onPress={() => openRecipe(item.idMeal)}>
              {item.strMeal} (uses {item.matches} of your ingredients)
            </Text>
          )}
        />
        <Modal visible={showConverter} animationType="slide">
          <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 50, gap: 12 }}>
            <Text style={{ fontSize: 22, fontWeight: 'bold' }}>Measurement converter</Text>
            <TextInput
              value={amountText}
              onChangeText={setAmountText}
              keyboardType="numeric"
              style={{ borderWidth: 1, padding: 10, borderRadius: 6}}
            />
            <Text>From</Text>
            <UnitPicker value={fromUnit} onChange={setFromUnit} />
            <Text>To</Text>
            <UnitPicker value={toUnit} onChange={setToUnit} />
            <Text style={{ fontSize: 20, fontWeight: 'bold' }}>{resultText}</Text>
            <Button title="Close" onPress={() => setShowConverter(false)} />
          </ScrollView>
        </Modal>
        <Modal visible={selected !== null} animationType="slide">
          <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 50, gap: 8}}>
            {selected && (
              <>
              <Text style = {{ fontSize: 22, fontWeight: 'bold' }}>{selected.title}</Text>
              <Text style = {{ fontWeight: 'bold' }}>Ingredients</Text>
              {selected.ingredients.map((ing, i) => {
                const have = items.some((it) =>
                  ing.name.toLowerCase().includes(it.name.toLowerCase())
              );
              return (
                <Text key={i}>
                  {have ? '✓' : '✗'} {ing.measure} {ing.name}
                </Text>
              );
              })}
              <Text style={{ fontWeight: 'bold', marginTop: 12 }}>Instructions</Text>
              <Text>{selected.instructions}</Text>
            </>
            )}
            <Button title="Close" onPress={() => setSelected(null)} />
          </ScrollView>
        </Modal>
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
