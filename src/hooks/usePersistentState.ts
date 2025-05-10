import { useState, useEffect } from 'react';

interface PersistentStateOptions {
  key: string;
  defaultValue: any;
  storage?: Storage;
}

export function usePersistentState<T>({ 
  key, 
  defaultValue, 
  storage = localStorage 
}: PersistentStateOptions): [T, (value: T) => void] {
  // Initialize state with stored value or default
  const [state, setState] = useState<T>(() => {
    try {
      const item = storage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Error reading from storage:', error);
      return defaultValue;
    }
  });

  // Update storage when state changes
  useEffect(() => {
    try {
      if (state === undefined) {
        storage.removeItem(key);
      } else {
        storage.setItem(key, JSON.stringify(state));
      }
    } catch (error) {
      console.error('Error writing to storage:', error);
    }
  }, [key, state, storage]);

  return [state, setState];
}

// Helper function to clear persistent state
export function clearPersistentState(key: string, storage: Storage = localStorage) {
  try {
    storage.removeItem(key);
  } catch (error) {
    console.error('Error clearing storage:', error);
  }
}

// Helper function to get all persistent state keys
export function getAllPersistentStateKeys(storage: Storage = localStorage): string[] {
  try {
    return Object.keys(storage);
  } catch (error) {
    console.error('Error getting storage keys:', error);
    return [];
  }
}

// Helper function to clear all persistent state
export function clearAllPersistentState(storage: Storage = localStorage) {
  try {
    storage.clear();
  } catch (error) {
    console.error('Error clearing all storage:', error);
  }
} 