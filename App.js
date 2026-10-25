import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, FlatList, TextInput, Button, Image, Modal, ScrollView, Pressable} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { findRecipes, getRecipe } from './recipes';
import { convert } from './convert';

const COLORS = { primary: '#2E7D32', bg: '#FFF8F0', text: '#222', card: '#fff' };

const Btn = ({ title, onPress, color = COLORS.primary }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => ({
      backgroundColor: color,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
      opacity: pressed ? 0.7 : 1,
    })}>
      <Text style={{ color: '#fff', fontWeight: '600' }}>{title}</Text>
    </Pressable>
)

export default function App() {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [recipes, setRecipes]  = useState([]);
  const [selected, setSelected] = useState(null);
  const [showConverter, setShowConverter] = useState(false);
  const [amountText, setAmountText] = useState('1');
  const [fromUnit, setFromUnit] = useState('cup');
  const [toUnit, setToUnit] = useState('tbsp');
  const [quizOpen, setQuizOpen] = useState(false);
  const [category, setCategory] = useState(null);
  const [area, setArea] = useState(null);
  const [keyword, setKeyword] = useState('');

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
      const results = await findRecipes(items.map((item) => item.name), { category, area, keyword });
      setRecipes(results);
      if (results.length === 0) {
        alert('No matches. Try fewer filters.');
      }
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
          style={{ padding: 8, borderWidth: 1, borderRadius: 6,
            backgroundColor: u === value ? '#cde' : '#fff' }}>
          {u}
        </Text>
      ))}
    </View>
  );

  const Choices = ({ options, value, onChange }) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {options.map((o) => (
        <Text
          key={o}
          onPress={() => onChange(value === o ? null : o)}
          style={{ padding: 8, borderWidth: 1, borderRadius: 6,
            backgroundColor: o === value ? '#cde' : '#fff' }}>
          {o}
            </Text>
      ))}
    </View>
  );

  const CATEGORIES = ['Breakfast', 'Starter', 'Side', 'Dessert', 'Chicken', 'Beef', 'Pasta', 'Seafood', 'Vegetarian', 'Vegan'];
  const AREAS = ['Italian', 'Mexican', 'Indian', 'Chinese', 'Japanese', 'American', 'French'];

  const sortedItems = [...items].sort((a, b) => Number(b.perishable) - Number(a.perishable));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>FridgeForage</Text>
      <Text style={styles.subtitle}>Cook what you already have</Text>

      <View style={styles.row}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Add an ingredient"
          style={styles.input}
        />
        <Btn title="Add" onPress={addItem} />
      </View>

      <View style={styles.row}>
        <Btn title="Take photo" onPress={takePhoto} color={COLORS.accent} />
        {photo && <Image source={{ uri: photo}} style={styles.thumb} />}
      </View>

      <FlatList
        style={{ flexGrow: 0, maxHeight: 220 }}
        data={sortedItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {item.photo && <Image source={{ uri: item.photo }} style={styles.thumb} />}
            <Text style={styles.cardText} onPress={() => togglePerishable(item.id)}>
              {item.name}
            </Text>
        )}
          style={{ flexGrow: 0 }}
          data={recipes}
          keyExtractor={(r) => r.idMeal}
          renderItem={({ item }) => (
            <Text onPress={() => openRecipe(item.idMeal)}>
              {item.strMeal} (uses {item.matches} of your ingredients)
            </Text>
          )}
        />

        <Modal visible={quizOpen} animationType="slide">
          <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 50, gap: 12 }}>
            <Text style={{ fontSize: 22, fontWeight: 'bold' }}>What are you in the mood for?</Text>
            <Text>Kind of meal</Text>
            <Choices options={CATEGORIES} value={category} onChange={setCategory} />
            <Text>Cuisine</Text>
            <Choices options={AREAS} value={area} onChange={setArea} />
            <Text>Word in the name (optional)</Text>
            <TextInput value={keyword} onChangeText={setKeyword} placeholder="soup, salad, pie..."
              style={{ borderWidth: 1, padding: 10, borderRadius: 6 }} />
            <Button title="Show recipes"onPress={() => { setQuizOpen(false); searchRecipes(); }} />
            <Button title="Cancel" onPress={() => setQuizOpen(false)} />
          </ScrollView>
        </Modal>
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
