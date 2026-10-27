import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, FlatList, TextInput, Button, Image, Modal, ScrollView, Pressable} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { findRecipes, getRecipe } from './recipes';
import { convert } from './convert';

const COLORS = { primary: '#2E7D32', bg: '#FFF8F0', accent: '#E65100', text: '#222', card: '#fff' };

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
         style={[styles.chip, u === value && styles.chipOn]}>
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
          style={[styles.chip, o === value && styles.chipOn]}>
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
            {item.perishable && <Text style={styles.tag}>use soon</Text>}
            <Btn title="Delete" color="#999" onPress={() => deleteItem(item.id)} />
          </View>
        )}
      />

      <View style={styles.row}>
        <Btn title="Find recipes" onPress={() => setQuizOpen(true)} />
        <Btn title="Converter" onPress={() => setShowConverter(true)} color={COLORS.accent} />
      </View>

      <FlatList
        style={{ flex: 1 }}
        data={recipes}
        keyExtractor={(r) => r.idMeal}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Image source={{ uri: item.strMealThumb }} style={styles.recipeImg} />
            <Text style={styles.cardText} onPress={() => openRecipe(item.idMeal)}>
              {item.strMeal}{'\n'}
              <Text style={{ color: '#666' }}>uses {item.matches} of your ingredients</Text>
            </Text>
          </View>
        )}
      />

        <Modal visible={quizOpen} animationType="slide">
          <ScrollView contentContainerStyle={styles.modal}>
            <Text style={styles.modalTitle}>What are you in the mood for?</Text>
            <Text style={styles.label}>Kind of meal</Text>
            <Choices options={CATEGORIES} value={category} onChange={setCategory} />
            <Text style={styles.label}>Cuisine</Text>
            <Choices options={AREAS} value={area} onChange={setArea} />
            <Text style={styles.label}>Word in the name (optional)</Text>
            <TextInput value={keyword} onChangeText={setKeyword}
              placeholder="soup, salad, pie..." style={styles.field} />
            <Btn title="Show recipes" onPress={() => { setQuizOpen(false); searchRecipes(); }} />
            <Btn title="Cancel" color='#999' onPress={() => setQuizOpen(false)} />
          </ScrollView>
        </Modal>

        <Modal visible={showConverter} animationType="slide">
          <ScrollView contentContainerStyle={styles.modal}>
            <Text style={styles.modalTitle}>Measurement converter</Text>
            <TextInput value={amountText} onChangeText={setAmountText}
              keyboardType="numeric" style={styles.field} />
            <Text style={styles.label}>From</Text>
            <UnitPicker value={fromUnit} onChange={setFromUnit} />
            <Text style={styles.label}>To</Text>
            <UnitPicker value={toUnit} onChange={setToUnit} />
            <View style={[styles.card, { justifyContent: 'center', padding: 16}]}>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: COLORS.primary }}>{resultText}</Text>
            </View>
            <Btn title="Close" color="#999" onPress={() => setShowConverter(false)} />
          </ScrollView>
        </Modal>

        <Modal visible={selected !== null} animationType="slide">
          <ScrollView contentContainerStyle={styles.modal}>
            {selected && (
              <>
                <Image source={{ uri: selected.image }} style={{ height: 200, borderRadius: 12 }} />
                <Text style={styles.modalTitle}>{selected.title}</Text>
                <Text style={styles.label}>Ingredients</Text>
                <View style={[styles.card, { flexDirection: 'column', alignItems: 'flex-start', gap: 6 }]}>
                  {selected.ingredients.map((ing, i) => {
                    const have = items.some((it) =>
                      ing.name.toLowerCase().includes(it.name.toLowerCase())
                    );
                    return(
                      <Text key={i} style={{ color: COLORS.text }}>
                        <Text style={{ color: have ? COLORS.primary : COLORS.accent, fontWeight: 'bold' }}>
                          {have ? '✓' : '✗'}
                        </Text>{' '}{ing.measure} {ing.name}
                      </Text>
                    );
                  })}
                </View>
                <Text style={styles.label}>Instructions</Text>
                <View style={styles.card}>
                  <Text style={{ flex: 1, color: COLORS.text, lineHeight: 22}}>{selected.instructions}</Text>
                </View>
              </>
            )}
            <Btn title="Close" color="#999" onPress={() => setSelected(null)} />
          </ScrollView>
        </Modal>
        <StatusBar style="auto" />
      </View>
    );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingTop: 60, paddingHorizontal: 16, gap: 12 },
  title: { fontSize: 30, fontWeight: 'bold', color: COLORS.primary },
  subtitle: { color: '#666', marginTop: -8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, backgroundColor: COLORS.card, borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 8 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.card, padding: 10, borderRadius: 10, marginBottom: 8 },
  cardText: { flex: 1, color: COLORS.text, fontSize: 16 },
  thumb: { width: 50, height: 50, borderRadius: 8 },
  recipeImg: { width: 64, height: 64, borderRadius: 8 },
  tag: { backgroundColor: COLORS.accent, color: '#fff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, fontSize: 12, overflow: 'hidden' },
  modal: { padding: 20, paddingTop: 60, gap: 12, backgroundColor: COLORS.bg, flexGrow: 1},
  modalTitle: { fontSize: 26, fontWeight: 'bold', color:COLORS.primary },
  label: { fontWeight: '600', color: COLORS.text, marginTop: 4 },
  field: {backgroundColor: COLORS.card, borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#ccc', borderRadius: 16, backgroundColor: COLORS.card, color: COLORS.text, overflow: 'hidden' },
  chipOn: { backgroundColor: '#DCEFDC', borderColor: COLORS.primary, color: COLORS.primary, fontWeight: '600' },
});
