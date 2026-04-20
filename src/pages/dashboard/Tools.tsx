import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Webhook, Save, Edit, X } from 'lucide-react';
import { db } from '../../lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';

const Tools = () => {
  const [showGhlFields, setShowGhlFields] = useState(false);
  const [showCalFields, setShowCalFields] = useState(false);
  const [editingGhl, setEditingGhl] = useState(false);
  const [editingCal, setEditingCal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { getEffectiveUser } = useAuth();
  const user = getEffectiveUser();

  // Current values
  const [ghlKey, setGhlKey] = useState('');
  const [ghlCalendarId, setGhlCalendarId] = useState('');
  const [ghlLocationId, setGhlLocationId] = useState('');
  const [calApiKey, setCalApiKey] = useState('');

  // Original values for tracking changes
  const [originalGhlKey, setOriginalGhlKey] = useState('');
  const [originalGhlCalendarId, setOriginalGhlCalendarId] = useState('');
  const [originalGhlLocationId, setOriginalGhlLocationId] = useState('');
  const [originalCalApiKey, setOriginalCalApiKey] = useState('');

  // Load data on initial mount
  useEffect(() => {
    if (user) {
      fetchToolSettings();
    }
  }, [user]);

  const fetchToolSettings = async () => {
    if (!user) return;

    try {
      const docRef = doc(db, 'users', user.uid, 'tools', 'settings');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();

        // Set current values
        setGhlKey(data.ghlKey || '');
        setGhlCalendarId(data.ghlCalendarId || '');
        setGhlLocationId(data.ghlLocationId || '');
        setCalApiKey(data.calApiKey || '');

        // Set original values
        setOriginalGhlKey(data.ghlKey || '');
        setOriginalGhlCalendarId(data.ghlCalendarId || '');
        setOriginalGhlLocationId(data.ghlLocationId || '');
        setOriginalCalApiKey(data.calApiKey || '');

        // Reset editing states
        setEditingGhl(false);
        setEditingCal(false);
      }
    } catch (error) {
      console.error('Error fetching tool settings:', error);
    }
  };

  // Check if GHL has changes
  const hasGhlChanges = () => {
    return ghlKey !== originalGhlKey || ghlCalendarId !== originalGhlCalendarId || ghlLocationId !== originalGhlLocationId;
  };

  // Check if Cal has changes
  const hasCalChanges = () => {
    return calApiKey !== originalCalApiKey;
  };

  // Save GHL settings
  const saveGhlSettings = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      const docRef = doc(db, 'users', user.uid, 'tools', 'settings');
      await setDoc(docRef, {
        ghlKey,
        ghlCalendarId,
        ghlLocationId,
        calApiKey: originalCalApiKey, // Keep the original cal value
        updatedAt: new Date(),
      }, { merge: true });

      // Update original values
      setOriginalGhlKey(ghlKey);
      setOriginalGhlCalendarId(ghlCalendarId);
      setEditingGhl(false);

      // Return to initial state
      setShowGhlFields(false);
    } catch (error) {
      console.error('Error saving GHL settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Save Cal settings
  const saveCalSettings = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      const docRef = doc(db, 'users', user.uid, 'tools', 'settings');

      await setDoc(docRef, {
        calApiKey,
        ghlKey: originalGhlKey, // Keep the original GHL values
        ghlCalendarId: originalGhlCalendarId,
        updatedAt: new Date(),
      }, { merge: true });

      // Update original value
      setOriginalCalApiKey(calApiKey);
      setEditingCal(false);

      // Return to initial state
      setShowCalFields(false);
    } catch (error) {
      console.error('Error saving Cal.com settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel GHL edits
  const cancelGhlEdit = () => {
    setGhlKey(originalGhlKey);
    setGhlCalendarId(originalGhlCalendarId);
    setGhlLocationId(originalGhlLocationId);
    setEditingGhl(false);
    setShowGhlFields(false);
  };

  // Cancel Cal edits
  const cancelCalEdit = () => {
    setCalApiKey(originalCalApiKey);
    setEditingCal(false);
    setShowCalFields(false);
  };

  // Toggle visibility of sections
  const toggleGhlFields = () => {
    // Cancel any ongoing edits
    if (editingGhl) {
      cancelGhlEdit();
    }

    if (editingCal) {
      cancelCalEdit();
    }

    setShowCalFields(false);
    setShowGhlFields(!showGhlFields);
  };

  const toggleCalFields = () => {
    // Cancel any ongoing edits
    if (editingGhl) {
      cancelGhlEdit();
    }

    if (editingCal) {
      cancelCalEdit();
    }

    setShowGhlFields(false);
    setShowCalFields(!showCalFields);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900 dark:text-white">
            Tools
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center">
            Integrations & Tools
            <span className="inline-flex items-center px-2 py-0.5 ml-2 text-xs font-medium bg-primary/10 text-primary dark:text-primary-400 rounded">
              Beta
            </span>
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-dark-200 rounded-xl shadow-sm border border-gray-100 dark:border-dark-100 overflow-hidden">
        <div className="p-8 text-center">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/20 flex items-center justify-center mx-auto mb-4">
            <Webhook className="w-8 h-8 text-primary dark:text-primary-400" />
          </div>
          <h3 className="text-xl font-heading font-bold text-gray-900 dark:text-white mb-3">
            Tools Configuration
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-lg mx-auto">
            Configure your integration settings below.
          </p>

          <div className="mt-8">
            <div className="flex flex-col sm:flex-row sm:justify-center gap-4">
              <button
                onClick={toggleGhlFields}
                className="px-4 py-2 rounded-lg border border-primary text-primary hover:bg-primary/10 dark:hover:bg-primary/20 transition w-full sm:w-auto"
              >
                {showGhlFields 
                  ? 'Hide GHL Settings' 
                  : ghlKey && ghlCalendarId 
                    ? 'Connected to GHL' 
                    : 'Connect to GHL'}
              </button>

              <button
                onClick={toggleCalFields}
                className="px-4 py-2 rounded-lg border border-primary text-primary hover:bg-primary/10 dark:hover:bg-primary/20 transition w-full sm:w-auto"
              >
                {showCalFields 
                  ? 'Hide Cal.com Settings' 
                  : calApiKey 
                    ? 'Connected to Cal.com' 
                    : 'Connect to Cal.com'}
              </button>
            </div>

            <AnimatePresence>
              {showGhlFields && (
                <motion.div
                  className="mt-6 space-y-4 max-w-md mx-auto text-left"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Private Integration Key
                    </label>
                    <input
                      type="text"
                      value={ghlKey}
                      onChange={(e) => setGhlKey(e.target.value)}
                      disabled={!editingGhl}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-dark-100 bg-white dark:bg-dark-100 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none disabled:bg-gray-100 dark:disabled:bg-dark-100"
                      placeholder="Enter your GHL key"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Calendar ID
                    </label>
                    <input
                      type="text"
                      value={ghlCalendarId}
                      onChange={(e) => setGhlCalendarId(e.target.value)}
                      disabled={!editingGhl}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-dark-100 bg-white dark:bg-dark-100 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none disabled:bg-gray-100 dark:disabled:bg-dark-100"
                      placeholder="Enter calendar ID"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Location ID
                    </label>
                    <input
                      type="text"
                      value={ghlLocationId}
                      onChange={(e) => setGhlLocationId(e.target.value)}
                      disabled={!editingGhl}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-dark-100 bg-white dark:bg-dark-100 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none disabled:bg-gray-100 dark:disabled:bg-dark-100"
                      placeholder="Enter location ID"
                    />
                  </div>

                  <div className="mt-4 flex justify-end gap-2">
                    {!editingGhl ? (
                      <button
                        onClick={() => setEditingGhl(true)}
                        className="px-3 py-2 rounded-lg border border-primary text-primary hover:bg-primary/10 transition flex items-center gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={cancelGhlEdit}
                          className="px-3 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-dark-100 dark:text-gray-400 dark:hover:bg-dark-100 transition flex items-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </button>
                        <button
                          onClick={saveGhlSettings}
                          disabled={isSaving || !hasGhlChanges()}
                          className={`px-3 py-2 rounded-lg border ${
                            hasGhlChanges() ? 'border-primary bg-primary text-white hover:bg-primary-600' : 'border-gray-300 bg-gray-100 text-gray-400'
                          } transition flex items-center gap-2`}
                        >
                          <Save className="w-4 h-4" />
                          {isSaving ? 'Saving...' : 'Save'}
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showCalFields && (
                <motion.div
                  className="mt-6 space-y-4 max-w-md mx-auto text-left"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      API Key
                    </label>
                    <input
                      type="text"
                      value={calApiKey}
                      onChange={(e) => setCalApiKey(e.target.value)}
                      disabled={!editingCal}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-dark-100 bg-white dark:bg-dark-100 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none disabled:bg-gray-100 dark:disabled:bg-dark-100"
                      placeholder="Enter your Cal.com API key"
                    />
                  </div>

                  <div className="mt-4 flex justify-end gap-2">
                    {!editingCal ? (
                      <button
                        onClick={() => setEditingCal(true)}
                        className="px-3 py-2 rounded-lg border border-primary text-primary hover:bg-primary/10 transition flex items-center gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={cancelCalEdit}
                          className="px-3 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-dark-100 dark:text-gray-400 dark:hover:bg-dark-100 transition flex items-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </button>
                        <button
                          onClick={saveCalSettings}
                          disabled={isSaving || !hasCalChanges()}
                          className={`px-3 py-2 rounded-lg border ${
                            hasCalChanges() ? 'border-primary bg-primary text-white hover:bg-primary-600' : 'border-gray-300 bg-gray-100 text-gray-400'
                          } transition flex items-center gap-2`}
                        >
                          <Save className="w-4 h-4" />
                          {isSaving ? 'Saving...' : 'Save'}
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tools;