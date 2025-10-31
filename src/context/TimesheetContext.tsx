import React, { createContext, useContext, useState, useEffect } from 'react';
import { TimeSheet, TimeEntry } from '../types';
import { generateId, getCurrentWeekRange, getWeekRange, isValidUUID } from '../utils/helpers';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

interface TimesheetContextType {
  timesheets: TimeSheet[];
  userTimesheets: TimeSheet[];
  availableProjects: any[];
  loading: boolean;
  getTimesheet: (id: string) => TimeSheet | undefined;
  addTimesheet: (timesheet: Omit<TimeSheet, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  addTimesheetWithCallback: (timesheet: Omit<TimeSheet, 'id' | 'createdAt' | 'updatedAt'>, callback: (id: string) => void) => void;
  updateTimesheet: (id: string, updates: Partial<TimeSheet>) => void;
  deleteTimesheet: (id: string) => void;
  addTimeEntry: (timesheetId: string, entry: TimeEntry) => void;
  updateTimeEntry: (timesheetId: string, entryId: string, updates: Partial<TimeEntry>) => void;
  deleteTimeEntry: (timesheetId: string, entryId: string) => Promise<void>;
  submitTimesheet: (timesheetId: string) => void;
  submitDayEntries: (timesheetId: string, date: string) => void;
  resetData: () => void;
  checkAndSubmitWeeklyTimesheets: () => void;
  syncData: () => Promise<void>;
  calculateWeekStatus: (timesheetId: string) => 'PENDING' | 'APPROVED' | 'REJECTED' | 'MIXED';
  approveDayByDate: (timesheetId: string, date: string, comment?: string) => Promise<void>;
  rejectDayByDate: (timesheetId: string, date: string, comment?: string) => Promise<void>;
  approveEntryById: (entryId: string, comment?: string) => Promise<void>;
  rejectEntryById: (entryId: string, comment?: string) => Promise<void>;
  resetDayByDate: (timesheetId: string, date: string) => Promise<void>;
  getDayStatus: (timesheetId: string, date: string) => 'not_registered' | 'draft' | 'pending' | 'approved' | 'rejected';
}

const TimesheetContext = createContext<TimesheetContextType | undefined>(undefined);

export const useTimesheets = () => {
  const context = useContext(TimesheetContext);
  if (!context) {
    throw new Error('useTimesheets must be used within a TimesheetProvider');
  }
  return context;
};

export const TimesheetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, employees, projects, user } = useAuth();
  const [timesheets, setTimesheets] = useState<TimeSheet[]>([]);
  const [loading, setLoading] = useState(false);

  // Données de démonstration
  const getDemoTimesheets = (): TimeSheet[] => [];

  // Initialiser les données
  useEffect(() => {
    if (currentUser) {
      console.log('🔄 TimesheetContext: Utilisateur connecté, chargement des données...');
      loadSupabaseTimesheets();
    }
  }, [currentUser]);

  // Forcer le rechargement quand l'utilisateur change
  useEffect(() => {
    if (currentUser) {
      console.log('🔄 TimesheetContext: Changement d\'utilisateur détecté, rechargement forcé...');
      loadSupabaseTimesheets();
    }
  }, [currentUser?.id]);

  // Écouter les mises à jour globales pour recharger les données
  useEffect(() => {
    const handleGlobalUpdate = () => {
      console.log('🔄 TimesheetContext: Mise à jour globale détectée, rechargement...');
      if (currentUser) {
        loadSupabaseTimesheets();
      }
    };

    window.addEventListener('globalTimesheetUpdate', handleGlobalUpdate);

    return () => {
      window.removeEventListener('globalTimesheetUpdate', handleGlobalUpdate);
    };
  }, [currentUser]);

  // Fonction pour charger les feuilles de temps depuis Supabase
  const loadSupabaseTimesheets = async () => {
    try {
      setLoading(true);
      console.log('📊 Chargement feuilles de temps Supabase...');

      // Vérifier la configuration Supabase
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        console.log('⚠️ Supabase non configuré, utilisation des données de démonstration');
        const demoTimesheets = getDemoTimesheets();
        setTimesheets(demoTimesheets);
        return;
      }

      // Charger directement depuis Supabase sans test de connectivité préalable
      console.log('📡 Tentative de connexion directe à Supabase...');

      // Charger les feuilles de temps pour l'utilisateur connecté
      const { data: timesheetsData, error: timesheetsError } = await supabase
        .from('timesheets')
        .select('*')
        .eq('user_id', currentUser?.id)
        .order('week_starting', { ascending: false });

      if (timesheetsError) {
        throw timesheetsError;
      }

      // Convertir les données Supabase
      const supabaseTimesheets: TimeSheet[] = timesheetsData.map(ts => ({
        id: ts.id,
        userId: ts.user_id,
        userName: ts.user_name || employees.find(emp => emp.id === ts.user_id)?.name || 'Utilisateur',
        companyId: ts.company_id,
        weekStarting: ts.week_starting,
        weekEnding: ts.week_ending,
        totalHours: ts.total_hours || 0,
        total_hours: ts.total_hours || 0,
        status: ts.status as 'draft' | 'submitted' | 'approved' | 'rejected',
        entries: [], // Les entrées seront chargées séparément
        createdAt: ts.created_at,
        updatedAt: ts.updated_at
      }));

      // Charger les entrées pour chaque feuille de temps
      for (const timesheet of supabaseTimesheets) {
        console.log('📋 Chargement entrées pour feuille:', timesheet.id);
        const { data: entriesData, error: entriesError } = await supabase
          .from('timesheet_entries')
          .select('*')
          .eq('timesheet_id', timesheet.id)
          .eq('user_id', currentUser?.id);

        if (!entriesError && entriesData) {
          timesheet.entries = entriesData.map(entry => {
            // CORRECTION: Pour les absences, afficher absence_hours au lieu de normal_hours
            const displayNormalHours = entry.is_absence
              ? 0  // Les absences n'affichent PAS de normal_hours
              : (entry.normal_hours || 0);

            const displayAbsenceHours = entry.is_absence
              ? (entry.absence_hours || 0)  // Lire depuis la colonne absence_hours
              : 0;

            return {
              id: entry.id,
              userId: entry.user_id,
              date: entry.date,
              projectId: entry.project_id,
              project: entry.project_name || 'Projet inconnu',
              normalHours: displayNormalHours,
              overtimeHours: entry.overtime_hours || 0,
              absenceHours: displayAbsenceHours,
              status: entry.status as 'draft' | 'pending' | 'approved' | 'rejected',
              rejectionReason: entry.rejection_reason,
              approvalComment: entry.approval_comment,
              decisionBy: entry.decision_by,
              decisionAt: entry.decision_at,
              isPaidLeave: entry.is_paid_leave || false,
              isAbsence: entry.is_absence || false,
              leaveType: entry.leave_type || null,
              createdAt: entry.created_at,
              updatedAt: entry.updated_at
            };
          });
          console.log('✅ Entrées chargées pour feuille', timesheet.id, ':', timesheet.entries.length, 'entrées');
        } else {
          console.log('⚠️ Aucune entrée trouvée pour feuille', timesheet.id, ':', entriesError);
          timesheet.entries = [];
        }
      }

      // Appliquer la soumission automatique aux semaines passées
      const processedTimesheets = applyAutomaticSubmissionToPastWeeks(supabaseTimesheets);
      setTimesheets(processedTimesheets);
      console.log('✅ Feuilles de temps Supabase chargées:', supabaseTimesheets.length);

    } catch (error) {
      // Gestion silencieuse des erreurs de connectivité
      console.log('⚠️ Supabase inaccessible, utilisation des données de démonstration');
      console.log('🔄 Utilisation des données de démonstration en fallback');
      const demoTimesheets = getDemoTimesheets();
      setTimesheets(demoTimesheets);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour appliquer la soumission automatique à toutes les semaines passées
  const applyAutomaticSubmissionToPastWeeks = (timesheets: TimeSheet[]): TimeSheet[] => {
    const now = new Date();
    
    console.log('⏰ Vérification soumission automatique à:', now.toISOString());
    console.log('📅 Jour de la semaine actuel:', now.getDay(), '(0=dimanche, 1=lundi, 6=samedi)');
    
    const processedTimesheets = timesheets.map(timesheet => {
      // CORRECTION : Calculer le DIMANCHE de la semaine française (lundi-dimanche) à 23h59
      const weekEndDate = new Date(timesheet.weekEnding + 'T23:59:59');
      
      console.log('📊 Vérification semaine:', {
        semaine: `${timesheet.weekStarting} - ${timesheet.weekEnding}`,
        dimanche23h59: weekEndDate.toISOString(),
        maintenant: now.toISOString(),
        estPasse: weekEndDate < now,
        status: timesheet.status
      });
      
      // Si le dimanche 23h59 de cette semaine est passé et la feuille est encore en draft
      if (weekEndDate < now && timesheet.status === 'draft') {
        console.log('📤 Soumission automatique rétroactive:', {
          semaine: `${timesheet.weekStarting} - ${timesheet.weekEnding}`,
          dimanche23h59: weekEndDate.toISOString(),
          now: now.toISOString(),
          statusAvant: timesheet.status
        });
        
        // 🎯 SAUVEGARDER IMMÉDIATEMENT EN BASE DE DONNÉES
        const saveAutomaticSubmissionToSupabase = async () => {
          try {
            if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
              console.log('💾 === SAUVEGARDE SOUMISSION AUTOMATIQUE EN BASE ===');
              console.log('📋 Timesheet ID:', timesheet.id);
              console.log('📅 Semaine:', `${timesheet.weekStarting} - ${timesheet.weekEnding}`);
              
              // Étape 1: Mettre à jour le statut de la feuille de temps
              const { error: timesheetError } = await supabase
                .from('timesheets')
                .update({
                  status: 'submitted',
                  updated_at: new Date().toISOString()
                })
                .eq('id', timesheet.id);
              
              if (timesheetError) {
                console.error('❌ Erreur mise à jour timesheet:', timesheetError);
                throw timesheetError;
              }
              
              console.log('✅ Timesheet mis à jour en base:', timesheet.id);
              
              // Étape 2: Mettre à jour toutes les entrées de cette semaine vers 'pending'
              const { data: updatedEntries, error: entriesError } = await supabase
                .from('timesheet_entries')
                .update({
                  status: 'pending',
                  updated_at: new Date().toISOString()
                })
                .eq('timesheet_id', timesheet.id)
                .eq('status', 'draft')
                .select();
              
              if (entriesError) {
                console.error('❌ Erreur mise à jour entries:', entriesError);
                throw entriesError;
              }
              
              console.log('✅ Entrées mises à jour en base:', updatedEntries?.length || 0);
              console.log('📊 Détail entrées mises à jour:', updatedEntries?.map(e => ({
                id: e.id,
                date: e.date,
                status: e.status,
                project_name: e.project_name
              })));
              
            }
          } catch (error) {
            console.error('❌ Exception sauvegarde soumission automatique:', error);
          }
        };
        
        // Exécuter la sauvegarde en arrière-plan
        saveAutomaticSubmissionToSupabase();
        
        // Générer les 7 jours de la semaine (lundi à dimanche)
        const weekDays = [];
        const startDate = new Date(timesheet.weekStarting);
        
        for (let i = 0; i < 7; i++) {
          const currentDay = new Date(startDate);
          currentDay.setDate(startDate.getDate() + i);
          const dayStr = currentDay.toISOString().split('T')[0];
          const dayOfWeek = currentDay.getDay(); // 0 = dimanche, 6 = samedi
          
          weekDays.push({
            date: dayStr,
            isWeekend: dayOfWeek === 0 || dayOfWeek === 6, // Samedi ou dimanche
            dayName: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'][dayOfWeek]
          });
        }
        
        // Créer des entrées pour les jours manquants (0h) ET gérer les jours incomplets
        const updatedEntries = [...timesheet.entries];

        weekDays.forEach(({ date: dayStr, isWeekend, dayName }) => {
          const dayEntries = timesheet.entries.filter(entry => entry.date === dayStr);
          const hasEntriesForDay = dayEntries.length > 0;

          // Calculer les heures de travail (exclure congés et absences)
          const workHours = dayEntries
            .filter(entry => !entry.isPaidLeave && !entry.isAbsence)
            .reduce((sum, entry) => sum + (entry.normalHours || 0) + (entry.overtimeHours || 0), 0);

          // Déterminer les heures requises (vendredi = 7h, autres = 8h)
          const dayOfWeek = new Date(dayStr).getDay();
          const requiredHours = dayOfWeek === 5 ? 7 : 8;

          if (!hasEntriesForDay) {
            if (isWeekend) {
              // WEEK-END : Ne pas créer d'entrée virtuelle si 0h
              console.log(`🏖️ ${dayName} ${dayStr} : 0h - PAS de soumission (week-end)`);
            } else {
              // JOUR OUVRÉ : Créer une entrée virtuelle à 0h pour validation admin
              const virtualEntry: TimeEntry = {
                id: `virtual-${timesheet.id}-${dayStr}`,
                userId: timesheet.userId,
                date: dayStr,
                startTime: '00:00',
                endTime: '00:00',
                breakDuration: 0,
                projectId: 'non-enregistre', // Identifiant spécial pour "Non enregistré"
                normalHours: 0,
                overtimeHours: 0,
                status: 'pending', // Soumis pour approbation
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };

              updatedEntries.push(virtualEntry);
              console.log(`📝 ${dayName} ${dayStr} : Entrée virtuelle 0h créée (jour ouvré)`);

              // 🎯 SAUVEGARDER L'ENTRÉE VIRTUELLE EN BASE
              const saveVirtualEntryToSupabase = async () => {
                try {
                  if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
                    const { error: virtualEntryError } = await supabase
                      .from('timesheet_entries')
                      .insert({
                        id: virtualEntry.id,
                        timesheet_id: timesheet.id,
                        user_id: virtualEntry.userId,
                        date: virtualEntry.date,
                        project_id: null, // Non enregistré
                        project_name: 'Non enregistré',
                        normal_hours: 0,
                        overtime_hours: 0,
                        status: 'pending'
                      });

                    if (virtualEntryError) {
                      console.error('❌ Erreur sauvegarde entrée virtuelle:', virtualEntryError);
                    } else {
                      console.log('✅ Entrée virtuelle sauvegardée:', virtualEntry.id);
                    }
                  }
                } catch (error) {
                  console.error('❌ Exception sauvegarde entrée virtuelle:', error);
                }
              };

              saveVirtualEntryToSupabase();
            }
          } else if (!isWeekend && workHours > 0 && workHours < requiredHours) {
            // JOUR OUVRÉ INCOMPLET : Créer une absence automatique pour compléter
            const missingHours = requiredHours - workHours;
            const absenceEntry: TimeEntry = {
              id: `absence-auto-${timesheet.id}-${dayStr}`,
              userId: timesheet.userId,
              date: dayStr,
              startTime: '00:00',
              endTime: '00:00',
              breakDuration: 0,
              projectId: null,
              normalHours: 0,
              overtimeHours: 0,
              absenceHours: missingHours,
              status: 'pending',
              isAbsence: true,
              isPaidLeave: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };

            updatedEntries.push(absenceEntry);
            console.log(`🚨 ${dayName} ${dayStr} : Absence auto ${missingHours}h créée (${workHours}h/${requiredHours}h)`);

            // 🎯 SAUVEGARDER L'ABSENCE EN BASE
            const saveAbsenceToSupabase = async () => {
              try {
                if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
                  const { error: absenceError } = await supabase
                    .from('timesheet_entries')
                    .insert({
                      id: absenceEntry.id,
                      timesheet_id: timesheet.id,
                      user_id: absenceEntry.userId,
                      date: absenceEntry.date,
                      project_id: null,
                      project_name: 'ABSENT',
                      normal_hours: 0,
                      overtime_hours: 0,
                      absence_hours: missingHours,
                      status: 'pending',
                      is_absence: true,
                      is_paid_leave: false
                    });

                  if (absenceError) {
                    console.error('❌ Erreur sauvegarde absence auto:', absenceError);
                  } else {
                    console.log('✅ Absence auto sauvegardée:', absenceEntry.id);
                  }
                }
              } catch (error) {
                console.error('❌ Exception sauvegarde absence auto:', error);
              }
            };

            saveAbsenceToSupabase();
          } else {
            // Marquer les entrées existantes comme pending (week-end ou jour ouvré complet)
            console.log(`✅ ${dayName} ${dayStr} : Heures existantes (${workHours}h/${requiredHours}h)`);
          }
        });
        
        return {
          ...timesheet,
          status: 'submitted',
          // Toutes les entrées (réelles + virtuelles) passent en "pending"
          entries: updatedEntries.map(entry => ({
            ...entry,
            status: 'pending'
          })),
          updatedAt: new Date().toISOString()
        };
      }
      
      return timesheet;
    });
    
    return processedTimesheets;
  };

  // Calculer userTimesheets
  const userTimesheets = timesheets.filter(ts => ts.userId === currentUser?.id);

  const getTimesheet = (id: string): TimeSheet | undefined => {
    return timesheets.find(ts => ts.id === id);
  };

  const addTimesheet = async (timesheet: Omit<TimeSheet, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
    const now = new Date().toISOString();
    const newTimesheet: TimeSheet = {
      ...timesheet,
      id: generateId(),
        userId: currentUser?.id || '',  // ID interne (users.id)
      updatedAt: now
    };
    
    // Sauvegarder dans Supabase d'abord
    try {
      if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
        const { error } = await supabase
          .from('timesheets')
          .insert({
            user_id: currentUser?.id,     // ID interne (users.id)
            auth_id: user?.id,            // ID auth (auth.uid())
            week_ending: newTimesheet.weekEnding,
            total_hours: newTimesheet.totalHours,
            status: newTimesheet.status
          });

        if (error) {
          console.error('❌ Erreur sauvegarde feuille Supabase:', error);
        } else {
          console.log('✅ Feuille sauvegardée dans Supabase:', newTimesheet.id);
        }
      }
    } catch (error) {
      console.error('❌ Exception sauvegarde feuille Supabase:', error);
    }

    // Utiliser une Promise pour garantir la mise à jour avant la navigation
    return new Promise((resolve) => {
      setTimesheets(prev => {
        const updated = [...prev, newTimesheet];
        console.log('✅ Feuille de temps ajoutée:', newTimesheet.id);
        
        // Résoudre la Promise après la mise à jour
        setTimeout(() => resolve(), 0);
        
        return updated;
      });
    });
  };

  const addTimesheetWithCallback = (timesheet: Omit<TimeSheet, 'id' | 'createdAt' | 'updatedAt'>, callback: (id: string) => void) => {
    const now = new Date().toISOString();
    const newTimesheet: TimeSheet = {
      ...timesheet,
      id: generateId(),
      createdAt: now,
      updatedAt: now
    };
    
    // Sauvegarder dans Supabase d'abord
    const saveToSupabase = async () => {
      try {
        if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
          const { error } = await supabase
            .from('timesheets')
            .insert({
              id: newTimesheet.id,
              user_id: newTimesheet.userId,
              company_id: newTimesheet.companyId,
              week_starting: newTimesheet.weekStarting,
              week_ending: newTimesheet.weekEnding,
              total_hours: newTimesheet.totalHours,
              status: newTimesheet.status
            });

          if (error) {
            console.error('❌ Erreur sauvegarde feuille Supabase:', error);
          } else {
            console.log('✅ Feuille sauvegardée dans Supabase:', newTimesheet.id);
          }
        }
      } catch (error) {
        console.error('❌ Exception sauvegarde feuille Supabase:', error);
      }
    };

    saveToSupabase();

    setTimesheets(prev => {
      const updated = [...prev, newTimesheet];
      console.log('✅ Feuille de temps ajoutée avec callback:', newTimesheet.id);
      
      // Exécuter le callback après la mise à jour
      setTimeout(() => callback(newTimesheet.id), 100);
      
      return updated;
    });
  };

  const updateTimesheet = (id: string, updates: Partial<TimeSheet>) => {
    // Mettre à jour dans Supabase
    const updateInSupabase = async () => {
      try {
        if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
          const { error } = await supabase
            .from('timesheets')
            .update({
              total_hours: updates.totalHours,
              status: updates.status,
              updated_at: new Date().toISOString()
            })
            .eq('id', id);

          if (error) {
            console.error('❌ Erreur mise à jour feuille Supabase:', error);
          } else {
            console.log('✅ Feuille mise à jour dans Supabase:', id);
          }
        }
      } catch (error) {
        console.error('❌ Exception mise à jour feuille Supabase:', error);
      }
    };

    updateInSupabase();

    setTimesheets(prev => prev.map(ts => 
      ts.id === id ? { ...ts, ...updates, updatedAt: new Date().toISOString() } : ts
    ));
  };

  const deleteTimesheet = (id: string) => {
    setTimesheets(prev => prev.filter(ts => ts.id !== id));
  };

  const addTimeEntry = (timesheetId: string, entry: TimeEntry) => {
    // CORRECTION CRITIQUE : Gérer les projets ET les congés/absences
    let cleanProjectId = entry.projectId;
    
    // Si c'est un congé ou une absence, project_id doit être NULL
    if (entry.isPaidLeave || entry.isAbsence) {
      cleanProjectId = null;
      console.log('🏖️ Congé/Absence détecté, project_id = NULL');
    } else if (entry.projectId && entry.projectId.includes('-secondary-')) {
      // Nettoyer l'UUID du projet si c'est un projet secondaire
      cleanProjectId = entry.projectId.split('-secondary-')[0];
      console.log('🔧 UUID projet nettoyé:', {
        original: entry.projectId,
        cleaned: cleanProjectId
      });
    }

    // Sauvegarder dans Supabase de façon synchrone
    const saveToSupabase = async () => {
      try {
        if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
          console.log('💾 === DÉBUT SAUVEGARDE SUPABASE ===');
          console.log('📋 Données à sauvegarder:', {
            id: entry.id,
            timesheet_id: timesheetId,
            user_id: entry.userId,
            date: entry.date,
            project_id: cleanProjectId, // Peut être NULL
            is_paid_leave: entry.isPaidLeave || false,
            is_absence: entry.isAbsence || false,
            leave_type: entry.leaveType || null,
            normal_hours: entry.normalHours,
            overtime_hours: entry.overtimeHours,
            absence_hours: entry.absenceHours,
            status: entry.status
          });

          // Récupérer les infos du projet depuis la base de données si nécessaire
          let projectName = 'Non défini';
          let projectCompanyId = null;
          let projectSecondaryCompanies = null;

          if (entry.isPaidLeave) {
            projectName = 'CONGÉS PAYÉS';
            console.log('🏖️ Type: Congé payé');
          } else if (entry.isAbsence) {
            projectName = 'ABSENT';
            console.log('🏥 Type: Absence');
          } else if (cleanProjectId) {
            console.log('🔍 Recherche du projet dans la base...');
            console.log('🆔 Project ID à chercher:', cleanProjectId);
            console.log('🆔 Project ID original:', entry.projectId);

            // Récupérer le projet depuis la base de données
            const { data: projectData, error: projectError } = await supabase
              .from('projects')
              .select('name, company_id, secondary_companies')
              .eq('id', cleanProjectId)
              .maybeSingle();

            console.log('📊 Résultat requête projet:', { projectData, projectError });

            if (!projectError && projectData) {
              projectName = projectData.name;
              projectCompanyId = projectData.company_id;
              projectSecondaryCompanies = projectData.secondary_companies;
              console.log('✅ Projet trouvé:', projectName);
            } else {
              projectName = 'Projet inconnu';
              console.log('❌ Projet NON trouvé - Erreur:', projectError);
              console.log('❌ Data reçue:', projectData);
            }
          } else {
            console.log('⚠️ Aucun projectId fourni');
          }

          console.log('🔍 ENTRY COMPLET REÇU:', entry);
          console.log('🔍 absenceHours présent?', 'absenceHours' in entry, entry.absenceHours);

          const { data, error} = await supabase
            .from('timesheet_entries')
            .insert({
              id: entry.id,
              timesheet_id: timesheetId,
              user_id: entry.userId,
              date: entry.date,
              project_id: cleanProjectId, // Utiliser l'UUID nettoyé ou NULL
              project_name: projectName,
              // Nouvelles colonnes
              is_paid_leave: entry.isPaidLeave || false,
              is_absence: entry.isAbsence || false,
              leave_type: entry.leaveType || null,
              start_time: entry.startTime,
              end_time: entry.endTime,
              break_duration: entry.breakDuration,
              // Insérer directement les valeurs du modal
              normal_hours: entry.normalHours || 0,
              overtime_hours: entry.overtimeHours || 0,
              absence_hours: entry.absenceHours || 0,
              status: entry.status
            })
            .select();

          if (error) {
            console.error('❌ === ERREUR SUPABASE DÉTAILLÉE ===');
            console.error('❌ Code:', error.code);
            console.error('❌ Message:', error.message);
            console.error('❌ Détails:', error.details);
            console.error('❌ Hint:', error.hint);
            
            // Messages d'erreur spécifiques
            if (error.code === '23503') {
              console.error('🚨 FOREIGN KEY VIOLATION - Référence invalide');
              if (error.message.includes('project_id')) {
                throw new Error(`Projet inexistant: ${entry.projectId}`);
              }
              if (error.message.includes('timesheet_id')) {
                throw new Error(`Feuille de temps inexistante: ${timesheetId}`);
              }
            } else if (error.code === '23505') {
              console.error('🚨 DUPLICATE KEY - Entrée déjà existante');
              throw new Error('Cette entrée existe déjà');
            } else {
              throw new Error(`Erreur base de données: ${error.message}`);
            }
          } else {
            console.log('✅ === SAUVEGARDE RÉUSSIE ===');
            console.log('📊 Données sauvegardées:', data);
            return data;
          }
        }
      } catch (error) {
        console.error('❌ Exception sauvegarde entrée Supabase:', error);
        throw error;
      }
    };

    // Exécuter la sauvegarde et attendre le résultat
    saveToSupabase()
      .then(async (savedData) => {
        console.log('✅ Entrée persistée avec succès dans Supabase:', savedData);

        // Créer l'entrée mise à jour avec les données de Supabase
        const savedEntry = savedData && savedData[0];
        const updatedEntry = savedEntry ? {
          ...entry,
          project: savedEntry.project_name, // Utiliser le nom depuis Supabase
        } : entry;

        // Mettre à jour l'état local seulement après succès Supabase
        let updatedTimesheet: TimeSheet | null = null;
        setTimesheets(prev => prev.map(ts => {
          if (ts.id === timesheetId) {
            const updatedEntries = [...ts.entries, updatedEntry];
            const totalHours = updatedEntries.reduce((sum, e) =>
              sum + (e.normalHours || 0) + (e.overtimeHours || 0), 0
            );

            updatedTimesheet = {
              ...ts,
              entries: updatedEntries,
              totalHours,
              updatedAt: new Date().toISOString()
            };
            return updatedTimesheet;
          }
          return ts;
        }));

        // NOUVELLE LOGIQUE: Recalculer automatiquement l'absence en fonction des heures travaillées
        if (!entry.isPaidLeave && !entry.isAbsence && updatedTimesheet) {
          const entryDate = entry.date;
          const isFriday = new Date(entryDate).getDay() === 5;
          const fullDayHours = isFriday ? 7 : 8;

          // Utiliser updatedTimesheet avec la nouvelle entrée déjà incluse
          const dayEntries = updatedTimesheet.entries.filter(e => e.date === entryDate);

          const workHours = dayEntries
            .filter(e => !e.isPaidLeave && !e.isAbsence)
            .reduce((sum, e) => sum + (e.normalHours || 0) + (e.overtimeHours || 0), 0);

          const partialAbsence = dayEntries.find(e => e.isAbsence);

          if (partialAbsence) {
            const newAbsenceHours = Math.max(0, fullDayHours - workHours);

            console.log('🔄 Recalcul automatique de l\'absence:', {
              date: entryDate,
              workHours,
              fullDayHours,
              currentAbsenceHours: partialAbsence.absenceHours,
              newAbsenceHours
            });

            try {
              if (newAbsenceHours === 0) {
                // Supprimer l'absence si les heures de travail >= fullDayHours
                await supabase
                  .from('timesheet_entries')
                  .delete()
                  .eq('id', partialAbsence.id);

                setTimesheets(prev => prev.map(ts => {
                  if (ts.id === timesheetId) {
                    const filteredEntries = ts.entries.filter(e => e.id !== partialAbsence.id);
                    const newTotalHours = filteredEntries.reduce((sum, e) =>
                      sum + (e.normalHours || 0) + (e.overtimeHours || 0), 0
                    );

                    return {
                      ...ts,
                      entries: filteredEntries,
                      totalHours: newTotalHours,
                      updatedAt: new Date().toISOString()
                    };
                  }
                  return ts;
                }));

                console.log('✅ Absence supprimée (journée complète travaillée)');
              } else if (newAbsenceHours !== partialAbsence.absenceHours) {
                // Mettre à jour les heures d'absence
                await supabase
                  .from('timesheet_entries')
                  .update({
                    absence_hours: newAbsenceHours,
                    is_absence: newAbsenceHours > 0,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', partialAbsence.id);

                setTimesheets(prev => prev.map(ts => {
                  if (ts.id === timesheetId) {
                    const updatedEntries = ts.entries.map(e =>
                      e.id === partialAbsence.id
                        ? { ...e, absenceHours: newAbsenceHours, isAbsence: newAbsenceHours > 0, updatedAt: new Date().toISOString() }
                        : e
                    );
                    const newTotalHours = updatedEntries.reduce((sum, e) =>
                      sum + (e.normalHours || 0) + (e.overtimeHours || 0), 0
                    );

                    return {
                      ...ts,
                      entries: updatedEntries,
                      totalHours: newTotalHours,
                      updatedAt: new Date().toISOString()
                    };
                  }
                  return ts;
                }));

                console.log('✅ Absence recalculée:', newAbsenceHours + 'h');
              }
            } catch (error) {
              console.error('❌ Erreur recalcul absence:', error);
            }
          }
        }

        // Déclencher un événement global pour notifier les autres composants
        window.dispatchEvent(new CustomEvent('globalTimesheetUpdate'));
      })
      .catch(error => {
        console.error('❌ === ÉCHEC SAUVEGARDE SUPABASE ===');
        console.error('❌ Erreur complète:', error);
        alert(`❌ Vos heures n'ont pas été enregistrées !\n\nErreur: ${error.message}\n\nVeuillez réessayer.`);
      });
  };

  const updateTimeEntry = async (timesheetId: string, entryId: string, updates: Partial<TimeEntry>) => {
    // Mettre à jour dans Supabase de façon synchrone
    const updateInSupabase = async () => {
      try {
        if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
          console.log('🔄 === DÉBUT MISE À JOUR SUPABASE ===');
          console.log('📋 Entry ID:', entryId);
          console.log('📋 Updates:', updates);

          // Récupérer l'entrée actuelle avant modification
          const timesheet = timesheets.find(ts => ts.id === timesheetId);
          const currentEntry = timesheet?.entries.find(e => e.id === entryId);

          if (!currentEntry) {
            throw new Error('Entrée introuvable');
          }

          const currentDate = currentEntry.date;
          const currentTotalHours = (currentEntry.normalHours || 0) + (currentEntry.overtimeHours || 0);
          const newTotalHours = (updates.normalHours !== undefined && updates.overtimeHours !== undefined)
            ? (updates.normalHours + updates.overtimeHours)
            : currentTotalHours;

          const hoursChanged = newTotalHours !== currentTotalHours;
          console.log('📊 Comparaison heures:', {
            current: currentTotalHours,
            new: newTotalHours,
            changed: hoursChanged
          });

          // Nettoyer le projectId comme dans addTimeEntry
          let cleanProjectId = updates.projectId;

          // Si c'est un congé ou une absence, project_id doit être NULL
          if (updates.isPaidLeave || updates.isAbsence) {
            cleanProjectId = null;
            console.log('🏖️ Congé/Absence détecté, project_id = NULL');
          } else if (updates.projectId && updates.projectId.includes('-secondary-')) {
            // Nettoyer l'UUID du projet si c'est un projet secondaire
            cleanProjectId = updates.projectId.split('-secondary-')[0];
            console.log('🔧 UUID projet nettoyé:', {
              original: updates.projectId,
              cleaned: cleanProjectId
            });
          }

          // Récupérer les infos du projet depuis la base de données si nécessaire
          let projectName = 'Non défini';
          let projectCompanyId = null;
          let projectSecondaryCompanies = null;

          if (updates.isPaidLeave) {
            projectName = 'CONGÉS PAYÉS';
            console.log('🏖️ Type: Congé payé');
          } else if (updates.isAbsence) {
            projectName = 'ABSENT';
            console.log('🏥 Type: Absence');
          } else if (cleanProjectId) {
            console.log('🔍 Recherche du projet dans la base...');
            console.log('🆔 Project ID à chercher:', cleanProjectId);
            console.log('🆔 Project ID original:', updates.projectId);

            const { data: projectData, error: projectError } = await supabase
              .from('projects')
              .select('name, company_id, secondary_companies')
              .eq('id', cleanProjectId)
              .maybeSingle();

            if (!projectError && projectData) {
              projectName = projectData.name;
              projectCompanyId = projectData.company_id;
              projectSecondaryCompanies = projectData.secondary_companies;
            } else {
              projectName = 'Projet inconnu';
            }
          }

          const { data, error } = await supabase
            .from('timesheet_entries')
            .update({
              date: updates.date,
              project_id: cleanProjectId,
              project_name: projectName,
              start_time: updates.startTime,
              end_time: updates.endTime,
              break_duration: updates.breakDuration,
              // Pour les absences : heures dans absence_hours uniquement
              normal_hours: updates.isAbsence ? 0 : updates.normalHours,
              overtime_hours: updates.overtimeHours,
              absence_hours: updates.isAbsence ? updates.absenceHours : 0,
              status: updates.status,
              is_paid_leave: updates.isPaidLeave || false,
              is_absence: updates.isAbsence || false,
              leave_type: updates.leaveType || null,
              updated_at: new Date().toISOString()
            })
            .eq('id', entryId)
            .select();

          if (error) {
            console.error('❌ === ERREUR MISE À JOUR SUPABASE ===');
            console.error('❌ Code:', error.code);
            console.error('❌ Message:', error.message);
            throw new Error(`Erreur mise à jour: ${error.message}`);
          }

          console.log('✅ === MISE À JOUR RÉUSSIE ===');
          console.log('📊 Données mises à jour:', data);

          // Si les heures ont changé, recalculer toutes les entrées du jour
          if (hoursChanged) {
            console.log('🔄 Les heures ont changé, recalcul nécessaire pour la journée');

            // Récupérer toutes les entrées du même jour (SEULEMENT les heures de travail, pas les absences/congés)
            const sameDayEntries = timesheet!.entries
              .filter(e => e.date === currentDate && !e.isPaidLeave && !e.isAbsence)
              .map(e => {
                // Appliquer les modifications à l'entrée en cours de mise à jour
                if (e.id === entryId) {
                  return {
                    ...e,
                    normalHours: updates.normalHours !== undefined ? updates.normalHours : e.normalHours,
                    overtimeHours: updates.overtimeHours !== undefined ? updates.overtimeHours : e.overtimeHours
                  };
                }
                return e;
              })
              .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

            console.log('📋 Entrées de TRAVAIL du jour à recalculer:', sameDayEntries.length);

            // Recalculer les heures normales et supplémentaires
            let cumulativeHours = 0;
            const entriesToUpdate: any[] = [];

            for (const entry of sameDayEntries) {
              const entryTotalHours = (entry.normalHours || 0) + (entry.overtimeHours || 0);
              const newNormalHours = Math.min(entryTotalHours, Math.max(0, 8 - cumulativeHours));
              const newOvertimeHours = entryTotalHours - newNormalHours;

              // Si les heures changent par rapport à l'état actuel, mettre à jour
              if (newNormalHours !== entry.normalHours || newOvertimeHours !== entry.overtimeHours) {
                entriesToUpdate.push({
                  id: entry.id,
                  normalHours: newNormalHours,
                  overtimeHours: newOvertimeHours
                });
              }

              cumulativeHours += newNormalHours;
            }

            // Mettre à jour les autres entrées dans Supabase si nécessaire
            if (entriesToUpdate.length > 0) {
              console.log('📝 Mise à jour de', entriesToUpdate.length, 'entrées suite au recalcul');

              for (const update of entriesToUpdate) {
                const { error: updateError } = await supabase
                  .from('timesheet_entries')
                  .update({
                    normal_hours: update.normalHours,
                    overtime_hours: update.overtimeHours,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', update.id);

                if (updateError) {
                  console.error('❌ Erreur mise à jour entrée:', update.id, updateError);
                } else {
                  console.log('✅ Entrée recalculée:', update.id, 'Normal:', update.normalHours, 'Supp:', update.overtimeHours);
                }
              }
            }

            return { data, entriesToUpdate };
          }

          return { data, entriesToUpdate: [] };
        }
      } catch (error) {
        console.error('❌ Exception mise à jour entrée Supabase:', error);
        throw error;
      }
    };

    // Exécuter la mise à jour et attendre le résultat
    return updateInSupabase()
      .then(async (result) => {
        if (!result) return;

        const { data: updatedData, entriesToUpdate } = result;
        console.log('✅ Entrée mise à jour avec succès dans Supabase:', updatedData);

        // Capturer l'état AVANT la mise à jour pour recalcul d'absence
        const currentTimesheet = timesheets.find(ts => ts.id === timesheetId);
        const currentEntry = currentTimesheet?.entries.find(e => e.id === entryId);
        const entryDate = currentEntry?.date;

        // Mettre à jour l'état local seulement après succès Supabase
        setTimesheets(prev => prev.map(ts => {
          if (ts.id === timesheetId) {
            let updatedEntries = ts.entries.map(entry => {
              // Appliquer la mise à jour principale
              if (entry.id === entryId) {
                return { ...entry, ...updates, updatedAt: new Date().toISOString() };
              }

              // Appliquer les recalculs aux autres entrées
              const recalc = entriesToUpdate.find((u: any) => u.id === entry.id);
              if (recalc) {
                return {
                  ...entry,
                  normalHours: recalc.normalHours,
                  overtimeHours: recalc.overtimeHours,
                  updatedAt: new Date().toISOString()
                };
              }

              return entry;
            });

            const totalHours = updatedEntries.reduce((sum, e) =>
              sum + (e.normalHours || 0) + (e.overtimeHours || 0), 0
            );

            return {
              ...ts,
              entries: updatedEntries,
              totalHours,
              updatedAt: new Date().toISOString()
            };
          }
          return ts;
        }));

        // NOUVELLE LOGIQUE: Recalculer automatiquement l'absence en fonction des heures travaillées (update)
        // Utiliser les données d'AVANT pour vérifier, mais recalculer avec les NOUVELLES valeurs
        if (currentEntry && !currentEntry.isPaidLeave && !currentEntry.isAbsence && entryDate) {
          const isFriday = new Date(entryDate).getDay() === 5;
          const fullDayHours = isFriday ? 7 : 8;

          // Recalculer avec les NOUVELLES valeurs
          const dayEntries = currentTimesheet!.entries.filter(e => e.date === entryDate);

          // Calculer les heures de travail APRÈS la modification
          const workHours = dayEntries
            .filter(e => !e.isPaidLeave && !e.isAbsence)
            .reduce((sum, e) => {
              // Utiliser les nouvelles valeurs pour l'entrée modifiée
              if (e.id === entryId) {
                const newNormal = updates.normalHours !== undefined ? updates.normalHours : e.normalHours;
                const newOvertime = updates.overtimeHours !== undefined ? updates.overtimeHours : e.overtimeHours;
                return sum + (newNormal || 0) + (newOvertime || 0);
              }
              // Utiliser les anciennes valeurs pour les autres
              return sum + (e.normalHours || 0) + (e.overtimeHours || 0);
            }, 0);

          const partialAbsence = dayEntries.find(e => e.isAbsence);

          if (partialAbsence) {
            const newAbsenceHours = Math.max(0, fullDayHours - workHours);

            console.log('🔄 Recalcul automatique de l\'absence (update):', {
              date: entryDate,
              workHours,
              fullDayHours,
              currentAbsenceHours: partialAbsence.absenceHours,
              newAbsenceHours
            });

            try {
              if (newAbsenceHours === 0) {
                // Supprimer l'absence si les heures de travail = fullDayHours
                await supabase
                  .from('timesheet_entries')
                  .delete()
                  .eq('id', partialAbsence.id);

                setTimesheets(prev => prev.map(ts => {
                  if (ts.id === timesheetId) {
                    const filteredEntries = ts.entries.filter(e => e.id !== partialAbsence.id);
                    const newTotalHours = filteredEntries.reduce((sum, e) =>
                      sum + (e.normalHours || 0) + (e.overtimeHours || 0), 0
                    );

                    return {
                      ...ts,
                      entries: filteredEntries,
                      totalHours: newTotalHours,
                      updatedAt: new Date().toISOString()
                    };
                  }
                  return ts;
                }));

                console.log('✅ Absence supprimée (journée complète travaillée) (update)');
              } else if (newAbsenceHours !== partialAbsence.absenceHours) {
                // Mettre à jour les heures d'absence
                await supabase
                  .from('timesheet_entries')
                  .update({
                    absence_hours: newAbsenceHours,
                    is_absence: newAbsenceHours > 0,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', partialAbsence.id);

                setTimesheets(prev => prev.map(ts => {
                  if (ts.id === timesheetId) {
                    const updatedEntries = ts.entries.map(e =>
                      e.id === partialAbsence.id
                        ? { ...e, absenceHours: newAbsenceHours, isAbsence: newAbsenceHours > 0, updatedAt: new Date().toISOString() }
                        : e
                    );
                    const newTotalHours = updatedEntries.reduce((sum, e) =>
                      sum + (e.normalHours || 0) + (e.overtimeHours || 0), 0
                    );

                    return {
                      ...ts,
                      entries: updatedEntries,
                      totalHours: newTotalHours,
                      updatedAt: new Date().toISOString()
                    };
                  }
                  return ts;
                }));

                console.log('✅ Absence recalculée (update):', newAbsenceHours + 'h');
              }
            } catch (error) {
              console.error('❌ Erreur recalcul absence (update):', error);
            }
          }
        }

        // Déclencher un événement global
        window.dispatchEvent(new CustomEvent('globalTimesheetUpdate'));
      })
      .catch(error => {
        console.error('❌ === ÉCHEC MISE À JOUR SUPABASE ===');
        alert(`❌ Modification non sauvegardée !\n\nErreur: ${error.message}`);
        throw error;
      });
  };

  const deleteTimeEntry = async (timesheetId: string, entryId: string) => {
    try {
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        throw new Error('Configuration Supabase manquante');
      }

      console.log('🗑️ === DÉBUT SUPPRESSION SUPABASE ===');
      console.log('📋 Timesheet ID:', timesheetId);
      console.log('📋 Entry ID à supprimer:', entryId);

      const { data: sessionData } = await supabase.auth.getSession();
      console.log('🔐 Session utilisateur:', {
        hasSession: !!sessionData.session,
        userId: sessionData.session?.user?.id
      });

      // Récupérer l'entrée à supprimer pour connaître sa date et créatedAt
      const timesheet = timesheets.find(ts => ts.id === timesheetId);
      const entryToDelete = timesheet?.entries.find(e => e.id === entryId);

      if (!entryToDelete) {
        throw new Error('Entrée introuvable');
      }

      const deletedDate = entryToDelete.date;
      const deletedCreatedAt = entryToDelete.createdAt;

      const { error } = await supabase
        .from('timesheet_entries')
        .delete()
        .eq('id', entryId);

      if (error) {
        console.error('❌ === ERREUR SUPPRESSION SUPABASE ===');
        console.error('❌ Code:', error.code);
        console.error('❌ Message:', error.message);
        console.error('❌ Details:', error.details);
        throw new Error(`Erreur suppression: ${error.message}`);
      }

      console.log('✅ === SUPPRESSION RÉUSSIE DE SUPABASE ===');

      // Récupérer les entrées du même jour après suppression pour recalculer
      const sameDayEntries = timesheet!.entries
        .filter(e => e.date === deletedDate && e.id !== entryId)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      console.log('🔄 Recalcul des heures pour', sameDayEntries.length, 'entrées du même jour');

      // Recalculer les heures normales et supplémentaires
      let cumulativeHours = 0;
      const entriesToUpdate: any[] = [];

      for (const entry of sameDayEntries) {
        const entryTotalHours = (entry.normalHours || 0) + (entry.overtimeHours || 0);
        const newNormalHours = Math.min(entryTotalHours, Math.max(0, 8 - cumulativeHours));
        const newOvertimeHours = entryTotalHours - newNormalHours;

        // Si les heures changent, mettre à jour
        if (newNormalHours !== entry.normalHours || newOvertimeHours !== entry.overtimeHours) {
          entriesToUpdate.push({
            id: entry.id,
            normalHours: newNormalHours,
            overtimeHours: newOvertimeHours
          });
        }

        cumulativeHours += newNormalHours;
      }

      // Mettre à jour les entrées dans Supabase si nécessaire
      if (entriesToUpdate.length > 0) {
        console.log('📝 Mise à jour de', entriesToUpdate.length, 'entrées suite au recalcul');

        for (const update of entriesToUpdate) {
          const { error: updateError } = await supabase
            .from('timesheet_entries')
            .update({
              normal_hours: update.normalHours,
              overtime_hours: update.overtimeHours,
              updated_at: new Date().toISOString()
            })
            .eq('id', update.id);

          if (updateError) {
            console.error('❌ Erreur mise à jour entrée:', update.id, updateError);
          } else {
            console.log('✅ Entrée recalculée:', update.id, 'Normal:', update.normalHours, 'Supp:', update.overtimeHours);
          }
        }
      }

      setTimesheets(prev => prev.map(ts => {
        if (ts.id === timesheetId) {
          // Supprimer l'entrée et appliquer les mises à jour
          let updatedEntries = ts.entries.filter(entry => entry.id !== entryId);

          // Appliquer les recalculs
          updatedEntries = updatedEntries.map(entry => {
            const update = entriesToUpdate.find(u => u.id === entry.id);
            if (update) {
              return {
                ...entry,
                normalHours: update.normalHours,
                overtimeHours: update.overtimeHours,
                updatedAt: new Date().toISOString()
              };
            }
            return entry;
          });

          const totalHours = updatedEntries.reduce((sum, e) =>
            sum + (e.normalHours || 0) + (e.overtimeHours || 0), 0
          );

          return {
            ...ts,
            entries: updatedEntries,
            totalHours,
            updatedAt: new Date().toISOString()
          };
        }
        return ts;
      }));

      console.log('✅ État local mis à jour avec recalcul des heures');

    } catch (error: any) {
      console.error('❌ === ÉCHEC SUPPRESSION ===');
      console.error('❌ Error:', error);
      alert(`❌ Impossible de supprimer l'entrée !\n\nErreur: ${error.message}`);
      throw error;
    }
  };

  const submitTimesheet = (timesheetId: string) => {
    setTimesheets(prev => prev.map(ts => {
      if (ts.id === timesheetId) {
        return {
          ...ts,
          status: 'submitted',
          entries: ts.entries.map(entry => ({ ...entry, status: 'pending' })),
          updatedAt: new Date().toISOString()
        };
      }
      return ts;
    }));
  };

  const submitDayEntries = (timesheetId: string, date: string) => {
    // Mettre à jour dans Supabase de façon synchrone
    const updateInSupabase = async () => {
      try {
        if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
          console.log('📤 === DÉBUT SOUMISSION JOUR SUPABASE ===');
          console.log('📋 Timesheet ID:', timesheetId);
          console.log('📅 Date:', date);
          console.log('👤 Current User ID:', currentUser?.id);
          
          // ÉTAPE 1: Vérifier la session utilisateur
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
          console.log('🔐 Session check:', {
            hasSession: !!sessionData.session,
            userEmail: sessionData.session?.user?.email,
            userId: sessionData.session?.user?.id,
            sessionError: sessionError?.message
          });
          
          if (!sessionData.session) {
            throw new Error('Session utilisateur expirée - Reconnectez-vous');
          }
          
          // ÉTAPE 2: Vérifier les entrées AVANT mise à jour
          const { data: entriesBeforeUpdate, error: selectError } = await supabase
            .from('timesheet_entries')
            .select('id, date, status, user_id, timesheet_id')
            .eq('timesheet_id', timesheetId)
            .eq('date', date)
            .eq('status', 'draft');
            
          console.log('🔍 Entrées AVANT mise à jour:', {
            count: entriesBeforeUpdate?.length || 0,
            entries: entriesBeforeUpdate,
            selectError: selectError?.message
          });
          
          if (!entriesBeforeUpdate || entriesBeforeUpdate.length === 0) {
            throw new Error(`Aucune entrée en 'draft' trouvée pour ${date}`);
          }
          
          // ÉTAPE 3: Vérifier les permissions avec un test
          console.log('🔐 Test permissions RLS...');
          const testEntryId = entriesBeforeUpdate[0].id;
          const { data: testUpdate, error: testError } = await supabase
            .from('timesheet_entries')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', testEntryId)
            .select();
            
          console.log('🧪 Test permissions:', {
            success: !testError,
            error: testError?.message,
            code: testError?.code,
            details: testError?.details
          });
          
          if (testError) {
            throw new Error(`Permissions insuffisantes: ${testError.message}`);
          }
          
          // ÉTAPE 4: Mettre à jour toutes les entrées de cette date de 'draft' vers 'pending'
          console.log('📝 Mise à jour du statut vers pending...');
          const { data, error } = await supabase
            .from('timesheet_entries')
            .update({
              status: 'pending',
              updated_at: new Date().toISOString()
            })
            .eq('timesheet_id', timesheetId)
            .eq('date', date)
            .eq('status', 'draft')
            .select();

          if (error) {
            console.error('❌ === ERREUR SOUMISSION SUPABASE ===');
            console.error('❌ Code:', error.code);
            console.error('❌ Message:', error.message);
            console.error('❌ Détails:', error.details);
            console.error('❌ Hint:', error.hint);
            throw new Error(`Erreur soumission jour: ${error.message}`);
          } else {
            console.log('✅ === SOUMISSION RÉUSSIE ===');
            console.log('📊 Entrées mises à jour:', data?.length || 0);
            console.log('📋 Données mises à jour:', data);
            
            // ÉTAPE 5: Vérifier que la mise à jour a bien eu lieu
            if (!data || data.length === 0) {
              throw new Error('AUCUNE ENTRÉE MISE À JOUR - Problème de permissions ou de données');
            }
            
            // ÉTAPE 6: Vérifier le statut après mise à jour
            const { data: entriesAfterUpdate, error: afterError } = await supabase
              .from('timesheet_entries')
              .select('id, date, status')
              .eq('timesheet_id', timesheetId)
              .eq('date', date);
              
            console.log('🔍 Entrées APRÈS mise à jour:', {
              count: entriesAfterUpdate?.length || 0,
              statuses: entriesAfterUpdate?.map(e => e.status) || [],
              afterError: afterError?.message
            });
            
            return data;
          }
        }
      } catch (error) {
        console.error('❌ === EXCEPTION SOUMISSION SUPABASE ===');
        console.error('❌ Type:', error.constructor.name);
        console.error('❌ Message:', error.message);
        console.error('❌ Stack:', error.stack);
        throw error;
      }
    };

    // Exécuter la mise à jour Supabase et attendre le résultat
    updateInSupabase()
      .then((updatedData) => {
        console.log('✅ Jour soumis avec succès dans Supabase:', updatedData);
        
        // Mettre à jour l'état local seulement après succès Supabase
        setTimesheets(prev => prev.map(ts => {
          if (ts.id === timesheetId) {
            const updatedEntries = ts.entries.map(entry => 
              entry.date === date && entry.status === 'draft'
                ? { ...entry, status: 'pending', updatedAt: new Date().toISOString() }
                : entry
            );
            
            return {
              ...ts,
              entries: updatedEntries,
              updatedAt: new Date().toISOString()
            };
          }
          return ts;
        }));
        
        // Déclencher un événement global pour notifier les autres composants
        window.dispatchEvent(new CustomEvent('globalTimesheetUpdate'));
      })
      .catch(error => {
        console.error('❌ === ÉCHEC SOUMISSION SUPABASE ===');
        alert(`❌ Soumission non effectuée !\n\nErreur: ${error.message}\n\nVeuillez réessayer.`);
      });

    setTimesheets(prev => prev.map(ts => {
      if (ts.id === timesheetId) {
        const updatedEntries = ts.entries.map(entry => 
          entry.date === date && entry.status === 'draft'
            ? { ...entry, status: 'pending', updatedAt: new Date().toISOString() }
            : entry
        );
        
        return {
          ...ts,
          entries: updatedEntries,
          updatedAt: new Date().toISOString()
        };
      }
      return ts;
    }));
    
    // Déclencher un événement global pour notifier les autres composants
    window.dispatchEvent(new CustomEvent('globalTimesheetUpdate'));
  };

  const resetData = () => {
    setTimesheets([]);
    console.log('🔄 Données des feuilles de temps réinitialisées');
  };

  const checkAndSubmitWeeklyTimesheets = () => {
    const now = new Date();
    console.log('⏰ Vérification soumission automatique à:', now.toISOString());
    console.log('📅 Jour actuel:', now.getDay(), '(0=dimanche, 1=lundi, 6=samedi)');
    console.log('🕐 Heure actuelle:', now.getHours() + 'h' + now.getMinutes());
    
    setTimesheets(prev => {
      const updated = prev.map(timesheet => {
        // CORRECTION : Calculer le dimanche de la semaine française à 23h59
        const weekEndDate = new Date(timesheet.weekEnding + 'T23:59:59');
        
        console.log('📊 Test soumission pour semaine:', {
          semaine: `${timesheet.weekStarting} - ${timesheet.weekEnding}`,
          dimanche23h59: weekEndDate.toISOString(),
          maintenant: now.toISOString(),
          estPasse: weekEndDate < now,
          statusActuel: timesheet.status
        });
        
        // Si le dimanche 23h59 de cette semaine est passé et la feuille est encore en draft
        if (weekEndDate < now && timesheet.status === 'draft') {
          console.log('📤 Soumission automatique:', {
            semaine: `${timesheet.weekStarting} - ${timesheet.weekEnding}`,
            dimanche23h59: weekEndDate.toISOString(),
            now: now.toISOString(),
            statusAvant: timesheet.status
          });
          
          // EXCLURE les congés et absences du calcul des heures totales
          const workEntries = timesheet.entries.filter(e => !e.isPaidLeave && !e.isAbsence);
          const totalHours = workEntries.reduce((sum, e) => 
            sum + (e.normalHours || 0) + (e.overtimeHours || 0), 0
          );
          
          return {
            ...timesheet,
            status: 'submitted',
            entries: timesheet.entries.map(entry => ({
              ...entry,
              status: 'pending'
            })),
            updatedAt: new Date().toISOString()
          };
        }
        
        return timesheet;
      });
      
      // Déclencher un événement global
      window.dispatchEvent(new CustomEvent('globalTimesheetUpdate'));
      
      return updated;
    });
  };

  const syncData = async () => {
    await loadSupabaseTimesheets();
  };

  const calculateWeekStatus = (timesheetId: string): 'PENDING' | 'APPROVED' | 'REJECTED' | 'MIXED' => {
    const timesheet = getTimesheet(timesheetId);
    if (!timesheet || timesheet.entries.length === 0) return 'PENDING';

    const statuses = timesheet.entries.map(entry => entry.status);
    const uniqueStatuses = [...new Set(statuses)];

    if (uniqueStatuses.length === 1) {
      switch (uniqueStatuses[0]) {
        case 'approved': return 'APPROVED';
        case 'rejected': return 'REJECTED';
        default: return 'PENDING';
      }
    }

    return 'MIXED';
  };

  const approveDayByDate = async (timesheetId: string, date: string, comment?: string) => {
    // Sauvegarder dans Supabase AVANT la mise à jour locale
    try {
      if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
        console.log('✅ === DÉBUT APPROBATION SUPABASE ===');
        console.log('📅 Date:', date);
        console.log('💬 Commentaire:', comment || null);
        
        // Obtenir l'ID de l'admin connecté
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session?.user) {
          throw new Error('Session admin expirée');
        }
        
        const adminId = session.user.id;
        console.log('👤 Admin ID:', adminId);
        
        const { data, error } = await supabase
          .from('timesheet_entries')
          .update({
            status: 'approved',
            approval_comment: comment,
            decision_by: adminId,
            decision_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('timesheet_id', timesheetId)
          .eq('date', date)
          .select();

        if (error) {
          console.error('❌ === ERREUR APPROBATION SUPABASE ===');
          console.error('❌ Code:', error.code);
          console.error('❌ Message:', error.message);
          console.error('❌ Détails:', error.details);
          throw new Error(`Erreur approbation: ${error.message}`);
        }
        
        console.log('✅ === APPROBATION RÉUSSIE ===');
        console.log('📊 Entrées mises à jour:', data?.length || 0);
        console.log('📋 Données:', data);
        
        if (!data || data.length === 0) {
          throw new Error('Aucune entrée mise à jour - Vérifiez les permissions');
        }
      }
    } catch (error) {
      console.error('❌ === ÉCHEC APPROBATION SUPABASE ===');
      alert(`❌ Approbation non sauvegardée !\n\nErreur: ${error.message}\n\nVeuillez réessayer.`);
      return; // Arrêter ici si Supabase échoue
    }

    // Mettre à jour l'état local SEULEMENT après succès Supabase
    setTimesheets(prev => prev.map(ts => {
      if (ts.id === timesheetId) {
        const updatedEntries = ts.entries.map(entry => 
          entry.date === date
            ? { 
                ...entry, 
                status: 'approved', 
                approvalComment: comment,
                decisionBy: currentUser?.id,
                decisionAt: new Date().toISOString(),
                updatedAt: new Date().toISOString() 
              }
            : entry
        );
        
        return {
          ...ts,
          entries: updatedEntries,
          updatedAt: new Date().toISOString()
        };
      }
      return ts;
    }));
    
    // Déclencher un événement global
    window.dispatchEvent(new CustomEvent('globalTimesheetUpdate'));
  };

  const rejectDayByDate = async (timesheetId: string, date: string, comment?: string) => {
    // Sauvegarder dans Supabase AVANT la mise à jour locale
    try {
      if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
        console.log('❌ === DÉBUT REFUS SUPABASE ===');
        console.log('📅 Date:', date);
        console.log('💬 Raison du refus:', comment || 'Aucune');
        
        // Obtenir l'ID de l'admin connecté
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session?.user) {
          throw new Error('Session admin expirée');
        }
        
        const adminId = session.user.id;
        console.log('👤 Admin ID:', adminId);
        
        const { data, error } = await supabase
          .from('timesheet_entries')
          .update({
            status: 'rejected',
            rejection_reason: comment || null,
            decision_by: adminId,
            decision_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('timesheet_id', timesheetId)
          .eq('date', date)
          .select();

        if (error) {
          console.error('❌ === ERREUR REFUS SUPABASE ===');
          console.error('❌ Code:', error.code);
          console.error('❌ Message:', error.message);
          console.error('❌ Détails:', error.details);
          throw new Error(`Erreur refus: ${error.message}`);
        }
        
        console.log('✅ === REFUS RÉUSSI ===');
        console.log('📊 Entrées mises à jour:', data?.length || 0);
        console.log('📋 Données:', data);

        if (!data || data.length === 0) {
          throw new Error('Aucune entrée mise à jour - Vérifiez les permissions');
        }

        // Envoyer la notification push au salarié
        if (data && data.length > 0 && data[0].user_id) {
          try {
            console.log('📲 Envoi notification de refus à user_id:', data[0].user_id);
            const response = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-rejection-notification`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({ userId: data[0].user_id }),
              }
            );

            if (!response.ok) {
              console.error('❌ Erreur envoi notification:', await response.text());
            } else {
              console.log('✅ Notification de refus envoyée avec succès');
            }
          } catch (notifError) {
            console.error('❌ Erreur notification:', notifError);
          }
        }
      }
    } catch (error) {
      console.error('❌ === ÉCHEC REFUS SUPABASE ===');
      alert(`❌ Refus non sauvegardé !\n\nErreur: ${error.message}\n\nVeuillez réessayer.`);
      return; // Arrêter ici si Supabase échoue
    }
    // Sauvegarder le message de refus dans localStorage pour le salarié
    if (comment && currentUser) {
      const timesheet = getTimesheet(timesheetId);
      if (timesheet) {
        const employee = employees.find(emp => emp.id === timesheet.userId);
        if (employee) {
          const message = {
            id: generateId(),
            userId: employee.id,
            type: 'rejection',
            title: `Refus du ${formatDate(date)}`,
            content: comment,
            date: new Date().toISOString(),
            read: false,
            from: currentUser.name,
            fromRole: 'admin'
          };
          
          // Charger les messages existants
          const existingMessages = localStorage.getItem(`messages-${employee.id}`);
          const messages = existingMessages ? JSON.parse(existingMessages) : [];
          messages.push(message);
          localStorage.setItem(`messages-${employee.id}`, JSON.stringify(messages));
          
          console.log('💬 Message de refus sauvegardé pour', employee.name);
        }
      }
    }

    setTimesheets(prev => prev.map(ts => {
      if (ts.id === timesheetId) {
        const updatedEntries = ts.entries.map(entry => 
          entry.date === date
            ? { 
                ...entry, 
                status: 'rejected', 
                rejectionReason: comment,
                decisionBy: currentUser?.id,
                decisionAt: new Date().toISOString(),
                updatedAt: new Date().toISOString() 
              }
            : entry
        );
        
        return {
          ...ts,
          entries: updatedEntries,
          updatedAt: new Date().toISOString()
        };
      }
      return ts;
    }));
    
    // Déclencher un événement global
    window.dispatchEvent(new CustomEvent('globalTimesheetUpdate'));
  };

  const resetDayByDate = async (timesheetId: string, date: string) => {
    setTimesheets(prev => prev.map(ts => {
      if (ts.id === timesheetId) {
        const updatedEntries = ts.entries.map(entry => 
          entry.date === date
            ? { 
                ...entry, 
                status: 'draft',
                rejectionReason: undefined,
                approvalComment: undefined,
                updatedAt: new Date().toISOString() 
              }
            : entry
        );
        
        return {
          ...ts,
          entries: updatedEntries,
          updatedAt: new Date().toISOString()
        };
      }
      return ts;
    }));
    
    // Déclencher un événement global
    window.dispatchEvent(new CustomEvent('globalTimesheetUpdate'));
  };

  const getDayStatus = (timesheetId: string, date: string): 'not_registered' | 'draft' | 'pending' | 'approved' | 'rejected' => {
    const timesheet = getTimesheet(timesheetId);
    if (!timesheet) return 'not_registered';

    const dayEntries = timesheet.entries.filter(entry => entry.date === date);
    if (dayEntries.length === 0) return 'not_registered';

    // NOUVELLE LOGIQUE : rejected > partially_approved > approved > pending > draft > not_registered
    if (dayEntries.some(entry => entry.status === 'rejected')) {
      // Si il y a du rejeté ET de l'approuvé = partiellement approuvé
      if (dayEntries.some(entry => entry.status === 'approved')) {
        return 'partially_approved';
      }
      return 'rejected';
    }
    if (dayEntries.every(entry => entry.status === 'approved')) return 'approved';
    if (dayEntries.some(entry => entry.status === 'pending')) return 'pending';
    if (dayEntries.some(entry => entry.status === 'draft')) return 'draft';

    return 'not_registered';
  };

  const formatDate = (date: string): string => {
    return new Date(date).toLocaleDateString('fr-FR');
  };

  const rejectEntryById = async (entryId: string, rejectionReason: string) => {
    try {
      console.log('🚫 === DÉBUT REFUS ENTRÉE INDIVIDUELLE ===');
      console.log('🆔 Entry ID:', entryId || 'MANQUANT');
      console.log('💬 Raison:', rejectionReason);

      if (!entryId) {
        throw new Error('Entry ID manquant');
      }

      // Récupérer l'entrée pour obtenir le user_id
      const { data: entryData, error: fetchError } = await supabase
        .from('timesheet_entries')
        .select('user_id')
        .eq('id', entryId)
        .single();

      if (fetchError) {
        console.error('❌ Erreur récupération entrée:', fetchError);
        throw new Error(`Erreur récupération: ${fetchError.message}`);
      }

      const userId = entryData?.user_id;

      // Mettre à jour seulement cette entrée spécifique
      const { data, error, count } = await supabase
        .from('timesheet_entries')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          decision_by: currentUser?.id,
          decision_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', entryId)
        .select();

      if (error) {
        console.error('❌ Erreur Supabase refus entrée:', error);
        throw new Error(`Erreur refus: ${error.message}`);
      }

      console.log('📊 Entrées mises à jour:', count);
      console.log('🎯 VÉRIFICATION: Doit être exactement 1 entrée');

      // Envoyer la notification push au salarié
      if (userId) {
        try {
          console.log('📲 Envoi notification de refus à user_id:', userId);

          const { data, error } = await supabase.functions.invoke('send-rejection-notification', {
            body: { userId }
          });

          if (error) {
            console.error('❌ Erreur envoi notification:', error);
          } else {
            console.log('✅ Notification de refus envoyée avec succès', data);
          }
        } catch (notifError) {
          console.error('❌ Erreur notification:', notifError);
        }
      }

      console.log('✅ === REFUS ENTRÉE INDIVIDUELLE RÉUSSI ===');

      // Recharger les données
      await syncData();
      window.dispatchEvent(new CustomEvent('globalTimesheetUpdate'));

    } catch (error) {
      console.error('❌ === ÉCHEC REFUS ENTRÉE ===');
      throw error;
    }
  };

  const approveEntryById = async (entryId: string, approvalComment?: string) => {
    try {
      console.log('✅ === DÉBUT APPROBATION ENTRÉE INDIVIDUELLE ===');
      console.log('🆔 Entry ID:', entryId || 'MANQUANT');
      console.log('💬 Commentaire:', approvalComment || 'Aucun');
      
      if (!entryId) {
        throw new Error('Entry ID manquant');
      }
      
      // Mettre à jour seulement cette entrée spécifique
      const { data, error, count } = await supabase
        .from('timesheet_entries')
        .update({
          status: 'approved',
          approval_comment: approvalComment,
          decision_by: currentUser?.id,
          decision_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', entryId)
        .select();
      
      if (error) {
        console.error('❌ Erreur Supabase approbation entrée:', error);
        throw new Error(`Erreur approbation: ${error.message}`);
      }
      
      console.log('📊 Entrées mises à jour:', count);
      console.log('🎯 VÉRIFICATION: Doit être exactement 1 entrée');
      
      console.log('✅ === APPROBATION ENTRÉE INDIVIDUELLE RÉUSSIE ===');
      
      // Recharger les données
      await syncData();
      window.dispatchEvent(new CustomEvent('globalTimesheetUpdate'));
      
    } catch (error) {
      console.error('❌ === ÉCHEC APPROBATION ENTRÉE ===');
      throw error;
    }
  };

  return (
    <TimesheetContext.Provider value={{
      timesheets,
      userTimesheets,
      availableProjects: projects,
      loading,
      getTimesheet,
      addTimesheet,
      addTimesheetWithCallback,
      updateTimesheet,
      deleteTimesheet,
      addTimeEntry,
      updateTimeEntry,
      deleteTimeEntry,
      submitTimesheet,
      submitDayEntries,
      resetData,
      checkAndSubmitWeeklyTimesheets,
      syncData,
      calculateWeekStatus,
      approveDayByDate,
      rejectDayByDate,
      approveEntryById,
      rejectEntryById,
      resetDayByDate,
      getDayStatus
    }}>
      {children}
    </TimesheetContext.Provider>
  );
};