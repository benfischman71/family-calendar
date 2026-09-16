import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, where, onSnapshot, updateDoc, deleteDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

function FamilyCalendarApp() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({ location: 'Home', description: '', person: '' });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        loadEvents(currentUser.uid);
      }
    });
    return unsubscribe;
  }, []);

  const loadEvents = (userId) => {
    const q = query(collection(db, 'events'), where('familyId', '==', userId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsList = [];
      snapshot.forEach((doc) => {
        eventsList.push({ id: doc.id, ...doc.data() });
      });
      setEvents(eventsList);
    });
    return unsubscribe;
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      setEmail('');
      setPassword('');
      setIsSignup(false);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleDayClick = (date) => {
    const existing = events.find(e => e.date === date);
    setSelectedDate(date);
    if (existing) {
      setEditId(existing.id);
      setFormData({ location: existing.location, description: existing.description, person: existing.person || '' });
    } else {
      setEditId(null);
      setFormData({ location: 'Home', description: '', person: 'You' });
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    try {
      if (editId) {
        const eventRef = doc(db, 'events', editId);
        await updateDoc(eventRef, formData);
      } else {
        await addDoc(collection(db, 'events'), {
          date: selectedDate,
          ...formData,
          familyId: user.uid,
          createdBy: user.email,
          createdAt: new Date()
        });
      }
      setShowForm(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, 'events', editId));
      setShowForm(false);
    } catch (err) {
      setError(err.message);
    }
  };

  if (!user) {
    return (
      <div style={{ maxWidth: '400px', margin: '0 auto', padding: '2rem' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>Family Calendar</h1>
        <form onSubmit={isSignup ? handleSignup : handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            style={{ padding: '12px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '14px' }}
            required
          />
          <input
