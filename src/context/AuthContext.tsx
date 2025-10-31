import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User, Company, Project } from '../types';
import { generateId, ensureValidUUID } from '../utils/helpers';

type AuthCtx = { 
  user: any | null; 
  session: any | null; 
  signIn: (email:string,password:string)=>Promise<void>; 
  signOut: ()=>Promise<void>; 
  isAdmin:boolean;
  // Garder les fonctions existantes pour la compatibilité
  currentUser: User | null;
  companies: Company[];
  employees: User[];
  projects: Project[];
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateEmployee: (employee: User) => void;
  addEmployee: (employee: Omit<User, 'id'>) => void;
  archiveEmployee: (employeeId: string) => void;
  restoreEmployee: (employeeId: string) => void;
  deleteEmployee: (employeeId: string) => Promise<void>;
  updateProject: (project: Project) => Promise<void>;
  addProject: (project: Omit<Project, 'id'>) => Promise<void>;
  archiveProject: (projectId: string) => Promise<void>;
  restoreProject: (projectId: string) => void;
  deleteProject: (projectId: string) => Promise<void>;
  syncData: () => Promise<void>;
  getProjectsForCompany: (companyId: string) => Project[];
  updateCompany: (companyId: string, updates: Partial<Company>) => void;
  addCompany: (company: Omit<Company, 'id' | 'createdAt' | 'updatedAt' | 'conventionCollective'>) => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  user:null,
  session:null,
  signIn:async()=>{},
  signOut:async()=>{},
  isAdmin:false,
  currentUser: null,
  companies: [],
  employees: [],
  projects: [],
  loading: false,
  login: async () => {},
  logout: () => {},
  updateEmployee: () => {},
  addEmployee: () => {},
  archiveEmployee: () => {},
  restoreEmployee: () => {},
  deleteEmployee: async () => {},
  updateProject: async () => {},
  addProject: async () => {},
  archiveProject: async () => {},
  restoreProject: () => {},
  deleteProject: async () => {},
  syncData: async () => {},
  getProjectsForCompany: () => [],
  updateCompany: () => {},
  addCompany: async () => {}
});

export const useAuth = () => useContext(Ctx);

// Données de démonstration
const getDemoCompanies = (): Company[] => [];

const getDemoEmployees = (): User[] => [];

const getDemoProjects = (): Project[] => [];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Données locales pour la compatibilité
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [notificationsChecked, setNotificationsChecked] = useState(false);

  // Liste des comptes de démonstration
  const DEMO_ACCOUNTS = [
    'ahlemoslah@outlook.fr',
    'employe1@company.com',
    'employe2@company.com',
    'employe3@company.com'
  ];

  // Filtrer les employés archivés
  const archivedEmployees = employees.filter(employee => employee.archived && employee.role !== 'admin');
  
  // Filtrer les employés actifs (non archivés ET statut active)
  const activeEmployees = employees.filter(employee => 
    !employee.archived && 
    employee.role !== 'admin' && 
    (employee.status === 'active' || !employee.status) // Compatibilité avec les anciens employés sans statut
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      
      if (data.session?.user) {
        // Utilisateur Supabase connecté, charger ses données
        loadSupabaseUser(data.session.user);
        loadSupabaseData();
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        loadSupabaseUser(s.user);
        loadSupabaseData();
      } else {
        // Déconnexion
        setCurrentUser(null);
        setIsAdmin(false);
        setCompanies([]);
        setEmployees([]);
        setProjects([]);
      }
      checkAdmin();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Vérifier les préférences de notifications au mount pour les salariés
  useEffect(() => {
    const checkNotificationPreferences = async () => {
      if (!currentUser || currentUser.role === 'admin' || notificationsChecked) {
        return;
      }

      try {
        console.log('🔔 === VÉRIFICATION PRÉFÉRENCES NOTIFICATIONS AU MOUNT ===');
        console.log('👤 Utilisateur:', currentUser.name);
        
        // Vérifier les préférences côté serveur
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/users-notifications?userId=${currentUser.id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (!response.ok) {
          console.log('⚠️ Impossible de récupérer les préférences notifications (non critique)');
          setNotificationsChecked(true);
          return;
        }

        const result = await response.json();
        console.log('📊 Préférences serveur:', result);

        // Si enabled=true et plateforme ≠ web, activer les notifications
        if (result.settings?.enabled === true) {
          console.log('✅ Notifications activées côté serveur, vérification plateforme...');
          
          // Import dynamique pour éviter les erreurs si Capacitor n'est pas disponible
          try {
            const { Capacitor } = await import('@capacitor/core');
            
            if (Capacitor.getPlatform() !== 'web') {
              console.log('📱 Plateforme mobile détectée, activation des notifications...');
              
              const { enableNotifications } = await import('../utils/pushNotifications');
              await enableNotifications(currentUser.id);
              
              console.log('✅ Notifications activées automatiquement au mount');
            } else {
              console.log('🌐 Plateforme web - pas de notifications push natives');
            }
          } catch (capacitorError) {
            console.log('⚠️ Capacitor non disponible, notifications push désactivées');
          }
        } else {
          console.log('🔕 Notifications désactivées côté serveur, rien à faire');
        }
        
      } catch (error) {
        console.error('❌ Erreur vérification préférences notifications:', error);
      } finally {
        setNotificationsChecked(true);
      }
    };

    // Délai pour laisser l'app se charger complètement
    if (currentUser && currentUser.role !== 'admin') {
      setTimeout(checkNotificationPreferences, 2000);
    }
  }, [currentUser, notificationsChecked]);

  // Fonction pour charger toutes les données depuis Supabase
  const loadSupabaseData = async () => {
    try {
      setLoading(true);
      console.log('📊 Chargement des données Supabase...');

     // Vérifier si Supabase est configuré
     if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
       console.log('⚠️ Supabase non configuré, utilisation des données de démonstration');
       setCompanies(getDemoCompanies());
       setEmployees(getDemoEmployees());
       setProjects(getDemoProjects());
       return;
     }
      // Charger les entreprises
     try {
       const { data: companiesData, error: companiesError } = await supabase
         .from('companies')
         .select('*')
         .order('name');

       if (companiesError) {
         throw companiesError;
       } else {
         const supabaseCompanies: Company[] = companiesData.map(c => ({
           id: c.id,
           name: c.name,
           email: c.email || '',
           adminEmail: c.admin_email || '',
           logoUrl: c.logo_url,
          siret: c.siret || '',
          apeCode: c.ape_code || '',
          phone: c.phone || '',
          address: c.address || null,
           conventionCollective: c.convention_collective || '',
           createdAt: c.created_at,
           updatedAt: c.updated_at
         }));
         setCompanies(supabaseCompanies);
         console.log('✅ Entreprises chargées:', supabaseCompanies.length);
        console.log('📸 Logos chargés:', supabaseCompanies.map(c => ({ name: c.name, logoUrl: c.logoUrl })));
       }
     } catch (companiesError) {
       console.log('🔄 Fallback vers données de démonstration pour les entreprises');
       setCompanies(getDemoCompanies());
     }

      // Charger les employés
     try {
       const { data: employeesData, error: employeesError } = await supabase
         .from('users')
         .select('*')
         .order('name');

       if (employeesError) {
         throw employeesError;
       } else {
         const supabaseEmployees: User[] = employeesData.map(e => ({
           id: e.id,
           email: e.email,
           name: e.name,
           role: e.role as 'admin' | 'employee',
           department: e.department || '',
           companyId: e.company_id,
           archived: e.archived || false,
           birthDate: e.birth_date,
           createdAt: e.created_at
         }));
         setEmployees(supabaseEmployees);
         console.log('✅ Employés chargés:', supabaseEmployees.length);
         
         // Fusionner avec les données de démonstration en évitant les doublons
         const demoEmployees = getDemoEmployees();
         const mergedEmployees: User[] = [];
         
         // Ajouter d'abord tous les employés Supabase
         supabaseEmployees.forEach(emp => {
           mergedEmployees.push(emp);
         });
         
         // Ajouter les employés de démo seulement s'ils n'existent pas déjà
         demoEmployees.forEach(demoEmp => {
           // Vérifier par email ET par nom pour éviter les doublons
           const existsInSupabase = supabaseEmployees.some(supEmp => 
             supEmp.email.toLowerCase() === demoEmp.email.toLowerCase() ||
             supEmp.name.toLowerCase() === demoEmp.name.toLowerCase()
           );
           if (!existsInSupabase) {
             mergedEmployees.push(demoEmp);
           } else {
             console.log('🔄 Employé démo ignoré (existe dans Supabase):', demoEmp.name, '-', demoEmp.email);
           }
         });
         
         setEmployees(mergedEmployees);
         console.log('✅ Employés fusionnés sans doublons:', mergedEmployees.length);
         console.log('📋 Liste finale:', mergedEmployees.map(emp => ({ name: emp.name, email: emp.email })));
       }
     } catch (employeesError) {
       console.log('🔄 Fallback vers données de démonstration pour les employés');
       setEmployees(getDemoEmployees());
     }

      // Charger les projets
     try {
       const { data: projectsData, error: projectsError } = await supabase
         .from('projects')
         .select('*')
         .order('name');

       if (projectsError) {
         throw projectsError;
       } else {
         const supabaseProjects: Project[] = projectsData.map(p => ({
           id: p.id,
           name: p.name,
           reference: p.reference,
           companyId: p.company_id,
           secondaryCompanies: p.secondary_companies || [],
           address: p.address,
           active: p.active,
           archived: p.archived || false
         }));
         
         // Fusionner avec les données de démonstration en évitant les doublons
         const demoProjects = getDemoProjects();
         const mergedProjects: Project[] = [];
         
         // Ajouter d'abord tous les projets Supabase
         supabaseProjects.forEach(proj => {
           mergedProjects.push(proj);
         });
         
         // Ajouter les projets de démo seulement s'ils n'existent pas déjà
         demoProjects.forEach(demoProj => {
           const existsInSupabase = supabaseProjects.some(supProj => 
             supProj.name.toLowerCase() === demoProj.name.toLowerCase() &&
             supProj.companyId === demoProj.companyId
           );
           if (!existsInSupabase) {
             mergedProjects.push(demoProj);
           } else {
             console.log('🔄 Projet démo ignoré (existe dans Supabase):', demoProj.name);
           }
         });
         
         setProjects(mergedProjects);
         console.log('✅ Projets fusionnés chargés:', mergedProjects.length);
       }
     } catch (projectsError) {
       console.log('🔄 Fallback vers données de démonstration pour les projets');
       setProjects(getDemoProjects());
     }

    } catch (error) {
      console.log('⚠️ Erreur lors du chargement des données, utilisation des données de démonstration');
     console.log('🔄 Aucune donnée chargée');
     setCompanies([]);
     setEmployees([]);
     setProjects([]);
    } finally {
      setLoading(false);
    }
  };


  async function checkAdmin() {
    try {
      console.log('🔍 Vérification statut admin...');
      console.log('👤 Utilisateur Supabase:', user ? 'Connecté' : 'Non connecté');
      console.log('👤 Utilisateur local:', currentUser ? currentUser.name : 'Non connecté');
      
      // Si pas d'utilisateur Supabase, pas d'admin
      if (!user) {
        console.log('📍 Pas d\'utilisateur Supabase - Pas d\'admin');
        setIsAdmin(false);
        return;
      }

      // Vérifier la configuration Supabase
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        console.log('⚠️ Supabase non configuré - Vérification rôle local');
        setIsAdmin(currentUser?.role === 'admin');
        return;
      }
      
      // Vérifier d'abord le rôle dans les données utilisateur locales
      if (currentUser && currentUser.role === 'admin') {
        console.log('✅ Utilisateur admin détecté dans les données locales');
        setIsAdmin(true);
        return;
      }
      
      try {
        console.log('📡 Appel fonction is_admin() Supabase...');
        // appelle la vue/fonction is_admin() côté DB (retourne true/false)
        const { data, error } = await supabase.rpc('is_admin');
        if (!error) {
          console.log('✅ Réponse Supabase is_admin:', data);
          setIsAdmin(Boolean(data));
        } else {
          console.log('❌ Erreur Supabase is_admin:', error.message);
          // Si Supabase échoue, vérifier le rôle local
          console.log('📍 Erreur Supabase - Vérification rôle local');
          setIsAdmin(currentUser?.role === 'admin');
        }
      } catch (fetchError) {
        console.error('❌ Erreur de connexion lors de checkAdmin:', fetchError);
        console.log('📍 Connexion échouée - Vérification rôle local');
        setIsAdmin(currentUser?.role === 'admin');
      }
    } catch (error) {
      console.error('❌ Exception lors de checkAdmin:', error);
      // En cas d'exception, vérifier le rôle local
      console.log('📍 Exception - Vérification rôle local');
      setIsAdmin(currentUser?.role === 'admin');
    }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }
  
  async function signOut() { 
    await supabase.auth.signOut(); 
  }

  // Fonctions de compatibilité pour l'existant
  const login = async (email: string, password: string) => {
    // Connexion uniquement - pas de création de compte automatique
    try {
      await signIn(email, password);
      console.log('✅ Connexion réussie');
    } catch (error: any) {
      console.error('❌ Erreur de connexion:', error);
      if (error.message?.includes('invalid_credentials') || error.message?.includes('Invalid login credentials')) {
        throw new Error('Email ou mot de passe incorrect. Vérifiez vos identifiants.');
      } else {
        throw new Error('Erreur de connexion. Veuillez réessayer.');
      }
    }
  };

  // Fonction pour charger les données utilisateur depuis Supabase
  const loadSupabaseUser = async (supabaseUser: any) => {
    try {
      // Vérifier la configuration Supabase avant de faire des requêtes
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        console.log('⚠️ Supabase non configuré');
        setCurrentUser(null);
        setIsAdmin(false);
        setCompanies([]);
        setEmployees([]);
        setProjects([]);
        return;
      }

      if (!supabaseUser) {
        console.error('Aucun utilisateur fourni à loadSupabaseUser');
        setCurrentUser(null);
        setIsAdmin(false);
        return;
      }

      console.log('👤 Utilisateur Supabase connecté:', supabaseUser.email);

      try {
        // Chercher l'utilisateur dans la table users
        const { data: userData, error: dbError } = await supabase
          .from('users')
          .select('*')
          .or(`auth_id.eq.${supabaseUser.id},email.eq.${supabaseUser.email}`)
          .limit(1);

        if (dbError) {
          console.error('Erreur base de données:', dbError);
          setCurrentUser(null);
          setIsAdmin(false);
          return;
        }

        if (userData && userData.length > 0) {
          // Utilisateur trouvé dans la base
          console.log('✅ Utilisateur trouvé dans la base:', userData[0]);
          const supabaseUser: User = {
            id: userData[0].id,
            email: userData[0].email,
            name: userData[0].name,
            role: userData[0].role as 'admin' | 'employee',
            department: userData[0].department || '',
            companyId: userData[0].company_id,
            archived: userData[0].archived || false,
            birthDate: userData[0].birth_date,
            createdAt: userData[0].created_at
          };
          setCurrentUser(supabaseUser);
          setIsAdmin(supabaseUser.role === 'admin');
        } else {
          console.log('⚠️ Utilisateur non trouvé dans la base');
          console.log('❌ Utilisateur non trouvé dans la table users');
          setCurrentUser(null);
          setIsAdmin(false);
        }
      } catch (fetchError) {
        console.error('❌ Erreur de connexion Supabase:', fetchError);
        console.log('⚠️ Impossible de se connecter à Supabase - Mode hors ligne');
        setCurrentUser(null);
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('❌ Exception loadSupabaseUser:', error);
      setCurrentUser(null);
      setIsAdmin(false);
    }
  };

  const logout = () => {
    // Révoquer le token push avant déconnexion
    if (currentUser) {
      (async () => {
      try {
        const { getCurrentPushToken, disableNotifications } = await import('../utils/pushNotifications');
        const currentToken = await getCurrentPushToken();
        
        if (currentToken) {
          console.log('🚫 Révocation token push lors de la déconnexion...');
          await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/push-revoke`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: currentUser.id,
              token: currentToken
            })
          });
          console.log('✅ Token push révoqué lors de la déconnexion');
        }
      } catch (error) {
        console.error('⚠️ Erreur révocation token (non critique):', error);
      }
    })();
    }
    
    setCurrentUser(null);
    setIsAdmin(false);
    signOut();
  };

  const updateEmployee = (employee: User) => {
    // Mettre à jour dans Supabase d'abord
    const updateInSupabase = async () => {
      try {
        if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
          const { error } = await supabase
            .from('users')
            .update({
              name: employee.name,
              email: employee.email,
              role: employee.role,
              department: employee.department,
              company_id: employee.companyId,
             birth_date: employee.birthDate || null,
             hire_date: employee.hireDate || null,
              archived: employee.archived
            })
            .eq('id', employee.id);

          if (error) {
            console.error('❌ Erreur mise à jour employé Supabase:', error);
          } else {
            console.log('✅ Employé mis à jour dans Supabase:', employee.id);
          }

          // Mettre à jour aussi dans la table employees
          const { error: employeeError } = await supabase
            .from('employees')
            .upsert({
              user_id: employee.id,
              first_name: employee.name.split(' ')[0] || '',
              last_name: employee.name.split(' ').slice(1).join(' ') || '',
             birth_date: employee.birthDate ? employee.birthDate : null,
             hire_date: employee.hireDate ? employee.hireDate : null,
              position: employee.department === 'Ouvrier' ? 'Employé' : employee.department
            }, {
              onConflict: 'user_id'
            });

          if (employeeError) {
            console.error('❌ Erreur mise à jour table employees:', employeeError);
          } else {
            console.log('✅ Table employees mise à jour avec succès');
          }
        }
      } catch (error) {
        console.error('❌ Exception mise à jour employé Supabase:', error);
      }
    };

    updateInSupabase();

    setEmployees(prev => prev.map(emp => emp.id === employee.id ? employee : emp));
    if (currentUser?.id === employee.id) {
      setCurrentUser(employee);
    }
  };

  const addEmployee = (employee: Omit<User, 'id'>) => {
    // Normalize email to lowercase
    const normalizedEmail = employee.email.toLowerCase();
    
    // Créer l'employé SANS envoyer d'invitation automatique
    const newEmployee: User = {
      ...employee,
      email: normalizedEmail,
      id: generateId(),
      archived: false
    };

    // Sauvegarder dans Supabase SANS invitation
    const saveToSupabase = async () => {
      try {
        if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
          console.log('💾 Sauvegarde employé dans Supabase:', newEmployee);
          
          // Insert into users table
          const { error: userError } = await supabase
            .from('users')
            .upsert({
              id: newEmployee.id,
              email: normalizedEmail,
              name: newEmployee.name,
              role: newEmployee.role,
              department: newEmployee.department,
              company_id: newEmployee.companyId,
              archived: newEmployee.archived || false,
             birth_date: newEmployee.birthDate ? newEmployee.birthDate : null,
             hire_date: newEmployee.hireDate ? newEmployee.hireDate : null
            }, { onConflict: 'id' });

          if (userError) {
            console.error('❌ Erreur sauvegarde utilisateur:', userError);
            throw userError;
          }

          console.log('✅ Employé sauvegardé dans Supabase (invitation à envoyer séparément)');

          // NE PAS envoyer d'invitation automatiquement
          // L'admin devra cliquer sur le bouton d'invitation dans la liste des employés
          console.log('ℹ️ Employé créé - Invitation à envoyer manuellement depuis la liste');
        }
      } catch (error) {
        console.error('❌ Exception sauvegarde employé:', error);
        throw error;
      }
    };

    // Sauvegarder sans invitation
    saveToSupabase()
      .then(() => {
        console.log('✅ Employé créé avec succès - Prêt pour invitation manuelle');
      })
      .catch(error => {
        console.error('❌ Échec persistance Supabase:', error);
        // Supprimer de l'état local si la sauvegarde Supabase échoue
        setEmployees(prev => prev.filter(emp => emp.id !== newEmployee.id));
        throw error;
      });

    // Ajouter à l'état local pour feedback immédiat
    setEmployees(prev => [...prev, newEmployee]);
    console.log('✅ Employé ajouté - Invitation à envoyer manuellement:', newEmployee.name);
  };

  const archiveEmployee = (employeeId: string) => {
    console.log('📦 === DÉBUT ARCHIVAGE EMPLOYÉ ===');
    console.log('🆔 Employee ID:', employeeId);
    
    // Trouver l'employé avant archivage
    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee) {
      console.error('❌ Employé non trouvé:', employeeId);
      return;
    }
    
    console.log('👤 Employé trouvé:', employee.name, '- Statut actuel archived:', employee.archived);
    
    // Mettre à jour dans Supabase d'abord
    const updateInSupabase = async () => {
      try {
        if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
          console.log('🚀 === REQUÊTE SUPABASE ARCHIVAGE EMPLOYÉ ===');
          
          // Vérifier d'abord si l'utilisateur est admin
          const { data: isAdminData, error: adminError } = await supabase.rpc('is_admin');
          
          if (adminError) {
            console.error('❌ Erreur vérification admin:', adminError);
            throw new Error(`Erreur vérification permissions: ${adminError.message}`);
          }
          
          if (!isAdminData) {
            console.error('❌ Utilisateur non admin');
            throw new Error('Permissions insuffisantes: seuls les administrateurs peuvent archiver les employés');
          }
          
          console.log('✅ Utilisateur admin confirmé pour archivage employé');
          
          // ÉTAPE 1 : Mettre à jour la table users
          const { data, error } = await supabase
            .from('users')
            .update({
              archived: true,
              archived_at: new Date().toISOString(),
              archived_by: user?.id || null,
              updated_at: new Date().toISOString()
            })
            .eq('id', employeeId)
            .select()
            .single();

          if (error) {
            console.error('❌ === ERREUR ARCHIVAGE EMPLOYÉ SUPABASE ===');
            console.error('❌ Code:', error.code);
            console.error('❌ Message:', error.message);
            console.error('❌ Détails:', error.details);
            console.error('❌ Employee ID:', employeeId);
            
            if (error.code === 'PGRST116') {
              throw new Error('Employé non trouvé ou permissions insuffisantes');
            } else {
              throw new Error(`Erreur archivage Supabase (${error.code}): ${error.message}`);
            }
          }

          console.log('✅ === ARCHIVAGE EMPLOYÉ SUPABASE RÉUSSI ===');
          console.log('📊 Données retournées:', data);
          console.log('✅ Statut après archivage:', { 
            archived: data.archived,
            archived_at: data.archived_at,
            name: data.name
          });
          
          // ÉTAPE 2 : Mettre à jour la table employees avec statut 'archived'
          const { error: employeeError } = await supabase
            .from('employees')
            .update({
              status: 'archived',
              archived_at: new Date().toISOString(),
              archived_by: user?.id || null,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', employeeId);

          if (employeeError) {
            console.error('⚠️ Erreur mise à jour table employees (non critique):', employeeError);
          } else {
            console.log('✅ Table employees mise à jour avec status=archived');
          }
          
          // ÉTAPE 3 : Créer un log d'audit
          try {
            await supabase.rpc('create_audit_log', {
              p_entity_type: 'employee',
              p_entity_id: employeeId,
              p_action: 'archived',
              p_performed_by: user?.id || null,
              p_details: { 
                employee_name: employee.name,
                employee_email: employee.email,
                company_id: employee.companyId 
              },
              p_reason: 'Archivage via interface admin'
            });
            console.log('✅ Log d\'audit créé pour archivage employé');
          } catch (auditError) {
            console.error('⚠️ Erreur création log audit (non critique):', auditError);
          }
        }
      } catch (error) {
        console.error('❌ Exception archivage employé Supabase:', error);
        throw error;
      }
    };

    // Exécuter la mise à jour Supabase
    updateInSupabase().catch(error => {
      console.error('❌ Erreur archivage employé:', error);
      alert(`❌ Erreur: ${error.message}`);
      // En cas d'erreur, recharger les données pour annuler le changement local
      loadSupabaseData();
    });

    // Mettre à jour l'état local immédiatement pour le feedback utilisateur
    setEmployees(prev => prev.map(emp => 
      emp.id === employeeId ? { 
        ...emp, 
        archived: true,
        archivedAt: new Date().toISOString(),
        archivedBy: user?.id || currentUser?.id || null
      } : emp
    ));
    
    console.log('✅ === ARCHIVAGE EMPLOYÉ TERMINÉ ===');
  };

  const restoreEmployee = (employeeId: string) => {
    console.log('🔄 === DÉBUT RESTAURATION EMPLOYÉ ===');
    console.log('🆔 Employee ID:', employeeId);
    
    // Trouver l'employé avant restauration
    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee) {
      console.error('❌ Employé non trouvé:', employeeId);
      return;
    }
    
    console.log('👤 Employé trouvé:', employee.name, '- Statut actuel archived:', employee.archived);
    
    // Mettre à jour dans Supabase d'abord
    const updateInSupabase = async () => {
      try {
        if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
          console.log('🚀 === REQUÊTE SUPABASE RESTAURATION EMPLOYÉ ===');
          
          // Vérifier d'abord si l'utilisateur est admin
          const { data: isAdminData, error: adminError } = await supabase.rpc('is_admin');
          
          if (adminError) {
            console.error('❌ Erreur vérification admin:', adminError);
            throw new Error(`Erreur vérification permissions: ${adminError.message}`);
          }
          
          if (!isAdminData) {
            console.error('❌ Utilisateur non admin');
            throw new Error('Permissions insuffisantes: seuls les administrateurs peuvent restaurer les employés');
          }
          
          console.log('✅ Utilisateur admin confirmé pour restauration employé');
          
          // ÉTAPE 1 : Mettre à jour la table users (remettre à NULL)
          const { data, error } = await supabase
            .from('users')
            .update({
              archived: false,
              archived_at: null,
              archived_by: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', employeeId)
            .select()
            .single();

          if (error) {
            console.error('❌ === ERREUR RESTAURATION EMPLOYÉ SUPABASE ===');
            console.error('❌ Code:', error.code);
            console.error('❌ Message:', error.message);
            console.error('❌ Employee ID:', employeeId);
            
            if (error.code === 'PGRST116') {
              throw new Error('Employé non trouvé ou permissions insuffisantes');
            } else {
              throw new Error(`Erreur restauration Supabase (${error.code}): ${error.message}`);
            }
          }

          console.log('✅ === RESTAURATION EMPLOYÉ SUPABASE RÉUSSIE ===');
          console.log('📊 Données retournées:', data);
          console.log('✅ Statut après restauration:', { 
            archived: data.archived,
            archived_at: data.archived_at,
            name: data.name
          });
          
          // ÉTAPE 2 : Mettre à jour la table employees (remettre status=active)
          const { error: employeeError } = await supabase
            .from('employees')
            .update({
              status: 'active',
              archived_at: null,
              archived_by: null,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', employeeId);

          if (employeeError) {
            console.error('⚠️ Erreur mise à jour table employees (non critique):', employeeError);
          } else {
            console.log('✅ Table employees mise à jour avec status=active');
          }
          
          // ÉTAPE 3 : Créer un log d'audit pour la restauration
          try {
            await supabase.rpc('create_audit_log', {
              p_entity_type: 'employee',
              p_entity_id: employeeId,
              p_action: 'restored',
              p_performed_by: user?.id || null,
              p_details: { 
                employee_name: employee.name,
                employee_email: employee.email,
                company_id: employee.companyId 
              },
              p_reason: 'Restauration via interface admin'
            });
            console.log('✅ Log d\'audit créé pour restauration employé');
          } catch (auditError) {
            console.error('⚠️ Erreur création log audit (non critique):', auditError);
          }
        }
      } catch (error) {
        console.error('❌ Exception restauration employé Supabase:', error);
        throw error;
      }
    };

    // Exécuter la mise à jour Supabase
    updateInSupabase().catch(error => {
      console.error('❌ Erreur restauration employé:', error);
      alert(`❌ Erreur: ${error.message}`);
      // En cas d'erreur, recharger les données pour annuler le changement local
      loadSupabaseData();
    });

    // Mettre à jour l'état local immédiatement pour le feedback utilisateur
    setEmployees(prev => prev.map(emp => 
      emp.id === employeeId ? { 
        ...emp, 
        archived: false,
        archivedAt: null,
        archivedBy: null
      } : emp
    ));
    
    console.log('✅ === RESTAURATION EMPLOYÉ TERMINÉE ===');
  };

  const deleteEmployee = async (employeeId: string) => {
    setEmployees(prev => prev.filter(emp => emp.id !== employeeId));
  };

  const updateProject = async (project: Project) => {
    try {
      console.log('🔄 === DÉBUT UPDATE PROJECT ===');
      console.log('📋 Projet reçu:', { 
        id: project.id, 
        name: project.name,
        active: project.active, 
        archived: project.archived 
      });
      
      const finalProject = { ...project };
      
      // RÈGLE MÉTIER : 
      // ❌ archived = TRUE ET active = TRUE (INTERDIT)
      // ❌ archived = FALSE ET active = FALSE (INTERDIT)
      if (finalProject.archived === true && finalProject.active === true) {
        console.log('❌ CONFLIT DÉTECTÉ : Projet archivé ne peut pas être actif');
        finalProject.active = false; // Forcer active = false si archivé
      }
      
      if (finalProject.archived === false && finalProject.active === false) {
        console.log('❌ CONFLIT DÉTECTÉ : Projet non archivé doit être actif');
        finalProject.active = true; // Forcer active = true si non archivé
      }
      
      console.log('✅ RÈGLE MÉTIER APPLIQUÉE:', {
        archived: finalProject.archived,
        active: finalProject.active,
        avant: { archived: project.archived, active: project.active },
        après: { archived: finalProject.archived, active: finalProject.active }
      });
      
      // Mettre à jour dans Supabase d'abord
      if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
        console.log('🚀 === REQUÊTE SUPABASE ===');
        
        // Vérifier d'abord si l'utilisateur est admin
        const { data: isAdminData, error: adminError } = await supabase.rpc('is_admin');
        
        if (adminError) {
          console.error('❌ Erreur vérification admin:', adminError);
          throw new Error(`Erreur vérification permissions: ${adminError.message}`);
        }
        
        if (!isAdminData) {
          console.error('❌ Utilisateur non admin');
          throw new Error('Permissions insuffisantes: seuls les administrateurs peuvent modifier les projets');
        }
        
        console.log('✅ Utilisateur admin confirmé');
        
        // Préparer les données pour Supabase
        const updateData = {
          name: finalProject.name,
          reference: finalProject.reference,
          company_id: finalProject.companyId,
          secondary_companies: finalProject.secondaryCompanies,
          address: finalProject.address,
          active: finalProject.active,
          archived: finalProject.archived,
          updated_at: new Date().toISOString()
        };
        
        console.log('💾 Données à envoyer à Supabase:', updateData);
        
        const { data, error } = await supabase
          .from('projects')
          .update(updateData)
          .eq('id', finalProject.id)
          .select()
          .single();

        if (error) {
          console.error('❌ === ERREUR SUPABASE DÉTAILLÉE ===');
          console.error('❌ Code:', error.code);
          console.error('❌ Message:', error.message);
          console.error('❌ Détails:', error.details);
          console.error('❌ Hint:', error.hint);
          console.error('❌ Données envoyées:', updateData);
          
          if (error.code === 'PGRST116') {
            throw new Error('Aucune ligne mise à jour - Vérifiez les permissions RLS ou l\'ID du projet');
          } else if (error.code === '42501') {
            throw new Error('Permissions insuffisantes - Seuls les administrateurs peuvent modifier les projets');
          } else {
            throw new Error(`Erreur Supabase (${error.code}): ${error.message}`);
          }
        }

        console.log('✅ === SUCCÈS SUPABASE ===');
        console.log('📊 Données retournées:', data);
        console.log('✅ Statuts mis à jour:', { 
          active: data.active, 
          archived: data.archived 
        });
        
        if (!data) {
          console.error('❌ Aucune donnée retournée - Problème RLS possible');
          throw new Error('Aucune donnée retournée par Supabase - Vérifiez les permissions');
        }
      }
      
      // Mettre à jour l'état local avec la version corrigée
      setProjects(prev => prev.map(proj => proj.id === finalProject.id ? finalProject : proj));
      
      console.log('✅ === UPDATE PROJECT TERMINÉ ===');
      
    } catch (error) {
      console.error('❌ === EXCEPTION UPDATE PROJECT ===');
      console.error('❌ Type:', error.constructor.name);
      console.error('❌ Message:', error.message);
      console.error('❌ Stack:', error.stack);
      throw error;
    }
  };

  const addProject = async (project: Omit<Project, 'id'>) => {
    try {
      const newProject: Project = {
        ...project,
        id: generateId(),
        companyId: ensureValidUUID(project.companyId)
      };

      // Essayer d'ajouter à Supabase d'abord
      if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
        const { data, error } = await supabase
          .from('projects')
          .insert({
            id: newProject.id,
            name: newProject.name,
            reference: newProject.reference,
            company_id: newProject.companyId,
            secondary_companies: newProject.secondaryCompanies,
            address: newProject.address,
            archived: newProject.archived,
            active: newProject.active
          })
          .select()
          .single();

        if (error) {
          console.error('❌ Erreur ajout projet Supabase:', error);
          throw error;
        }

        console.log('✅ Projet ajouté à Supabase:', data);
      }

      // Ajouter localement
      setProjects(prev => [...prev, newProject]);
      console.log('✅ Projet ajouté localement:', newProject.name);
    } catch (error) {
      console.error('❌ Erreur addProject:', error);
      // En cas d'erreur Supabase, ajouter quand même localement
      const newProject: Project = {
        ...project,
        id: generateId(),
        companyId: ensureValidUUID(project.companyId)
      };
      setProjects(prev => [...prev, newProject]);
      console.log('⚠️ Projet ajouté localement seulement (erreur Supabase)');
      throw error; // Re-throw pour que l'interface utilisateur puisse gérer l'erreur
    }
  };

  const archiveProject = async (projectId: string) => {
    try {
      console.log('📦 === DÉBUT ARCHIVAGE PROJECT ===');
      console.log('🆔 Project ID:', projectId);
      
      // Mettre à jour dans Supabase d'abord
      if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
        // Vérifier d'abord si l'utilisateur est admin
        const { data: isAdminData, error: adminError } = await supabase.rpc('is_admin');
        
        if (adminError) {
          console.error('❌ Erreur vérification admin:', adminError);
          throw new Error(`Erreur vérification permissions: ${adminError.message}`);
        }
        
        if (!isAdminData) {
          console.error('❌ Utilisateur non admin');
          throw new Error('Permissions insuffisantes: seuls les administrateurs peuvent archiver les projets');
        }
        
        console.log('✅ Utilisateur admin confirmé pour archivage');
        
        const { data, error } = await supabase
          .from('projects')
          .update({
            archived: true,
            active: false, // RÈGLE MÉTIER : archived = TRUE → active = FALSE
            updated_at: new Date().toISOString()
          })
          .eq('id', projectId)
          .select()
          .single();

        if (error) {
          console.error('❌ === ERREUR ARCHIVAGE SUPABASE ===');
          console.error('❌ Code:', error.code);
          console.error('❌ Message:', error.message);
          console.error('❌ Détails:', error.details);
          console.error('❌ Project ID:', projectId);
          
          if (error.code === 'PGRST116') {
            throw new Error('Projet non trouvé ou permissions insuffisantes');
          } else {
            throw new Error(`Erreur archivage Supabase (${error.code}): ${error.message}`);
          }
        }

        console.log('✅ === ARCHIVAGE SUPABASE RÉUSSI ===');
        console.log('📊 Données retournées:', data);
        console.log('✅ Statuts après archivage:', { 
          active: data.active, 
          archived: data.archived 
        });
      }
    } catch (error) {
      console.error('❌ === EXCEPTION ARCHIVAGE ===');
      console.error('❌ Message:', error.message);
      throw error; // Re-throw pour que l'interface utilisateur puisse gérer l'erreur
    }

    // Mettre à jour l'état local
    setProjects(prev => prev.map(proj => 
      proj.id === projectId ? { ...proj, archived: true, active: false } : proj
    ));
    
    console.log('✅ === ARCHIVAGE TERMINÉ ===');
  };

  const restoreProject = (projectId: string) => {
    console.log('🔄 === DÉBUT RESTAURATION PROJECT ===');
    console.log('🆔 Project ID:', projectId);
    
    // Mettre à jour dans Supabase d'abord
    const updateInSupabase = async () => {
      try {
        if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
          // Vérifier d'abord si l'utilisateur est admin
          const { data: isAdminData, error: adminError } = await supabase.rpc('is_admin');
          
          if (adminError) {
            console.error('❌ Erreur vérification admin:', adminError);
            throw new Error(`Erreur vérification permissions: ${adminError.message}`);
          }
          
          if (!isAdminData) {
            console.error('❌ Utilisateur non admin');
            throw new Error('Permissions insuffisantes: seuls les administrateurs peuvent restaurer les projets');
          }
          
          console.log('✅ Utilisateur admin confirmé pour restauration');
          
          const { data, error } = await supabase
            .from('projects')
            .update({
              archived: false,
              active: true, // RÈGLE MÉTIER : archived = FALSE → active = TRUE
              updated_at: new Date().toISOString()
            })
            .eq('id', projectId)
            .select()
            .single();

          if (error) {
            console.error('❌ === ERREUR RESTAURATION SUPABASE ===');
            console.error('❌ Code:', error.code);
            console.error('❌ Message:', error.message);
            console.error('❌ Project ID:', projectId);
            throw new Error(`Erreur restauration Supabase (${error.code}): ${error.message}`);
          }

          console.log('✅ === RESTAURATION SUPABASE RÉUSSIE ===');
          console.log('📊 Données retournées:', data);
          console.log('✅ Statuts après restauration:', { 
            active: data.active, 
            archived: data.archived 
          });
        }
      } catch (error) {
        console.error('❌ Exception restauration Supabase:', error);
        throw error;
      }
    };

    // Exécuter la mise à jour Supabase
    updateInSupabase().catch(error => {
      console.error('❌ Erreur restauration:', error);
      alert(`❌ Erreur: ${error.message}`);
    });

    // Mettre à jour l'état local (RÈGLE : archived = FALSE → active = TRUE)
    setProjects(prev => prev.map(proj => 
      proj.id === projectId ? { ...proj, archived: false, active: true } : proj
    ));
    
    console.log('✅ === RESTAURATION TERMINÉE ===');
  };

  const deleteProject = async (projectId: string) => {
    try {
      // Supprimer de Supabase d'abord
      if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
        console.log('🗑️ Suppression projet dans Supabase:', projectId);
        
        const { error } = await supabase
          .from('projects')
          .delete()
          .eq('id', projectId);

        if (error) {
          console.error('❌ Erreur suppression projet Supabase:', error);
          throw error;
        }

        console.log('✅ Projet supprimé dans Supabase');
      }
    } catch (error) {
      console.error('❌ Erreur deleteProject:', error);
      throw error;
    }

    // Supprimer de l'état local
    setProjects(prev => prev.filter(proj => proj.id !== projectId));
  };

  const syncData = async () => {
    await loadSupabaseData();
    if (user) {
      await loadSupabaseUser(user);
    }
    await checkAdmin();
  };

  const getProjectsForCompany = (companyId: string): Project[] => {
    const allProjects: Project[] = [];
    
    projects.filter(project => {
      // 1. Critères d'entreprise en priorité (plus sélectifs)
      const isPrimaryProject = project.companyId === companyId;
      const isSecondaryProject = project.secondaryCompanies && 
                                project.secondaryCompanies.includes(companyId);
      
      // 2. Puis critères d'état (sur subset réduit)
      const isActiveAndNotArchived = project.active && !project.archived;
      
      return (isPrimaryProject || isSecondaryProject) && isActiveAndNotArchived;
    }).forEach(project => {
      if (project.companyId === companyId) {
        allProjects.push(project);
      } else if (project.secondaryCompanies?.includes(companyId)) {
        const primaryCompany = companies.find(c => c.id === project.companyId);
        const prefix = primaryCompany ? primaryCompany.name.charAt(0).toUpperCase() : 'X';
        
        const secondaryProject: Project = {
          ...project,
          id: `${project.id}-secondary-${companyId}`,
          name: `${prefix} - ${project.name}`,
          isSecondaryProject: true,
          originalName: project.name,
          primaryCompanyId: project.companyId
        };
        
        allProjects.push(secondaryProject);
      }
    });
    
    return allProjects;
  };

  const updateCompany = (companyId: string, updates: Partial<Company>) => {
    console.log('🔄 Mise à jour entreprise:', companyId, updates);
    
    // Retourner une Promise pour la sauvegarde
    return new Promise<void>(async (resolve, reject) => {
      try {
        // Vérifier que l'entreprise existe localement
        const localCompany = companies.find(c => c.id === companyId);
        if (!localCompany) {
          console.error('❌ Entreprise non trouvée localement:', companyId);
          reject(new Error('Entreprise non trouvée dans les données locales'));
          return;
        }
        
        console.log('✅ Entreprise trouvée localement:', localCompany.name);
        
        if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
          console.log('🚀 === DÉBUT SAUVEGARDE ENTREPRISE ===');
          console.log('🆔 Company ID:', companyId);
          console.log('📋 Updates reçus:', updates);
          
          // Construire l'objet de mise à jour avec tous les champs
          const updateData: any = {
            updated_at: new Date().toISOString()
          };
          
          // Mapper tous les champs possibles
          if (updates.name) updateData.name = updates.name;
          if (updates.email) updateData.email = updates.email;
          if (updates.adminEmail) updateData.admin_email = updates.adminEmail;
          if (updates.logoUrl !== undefined) updateData.logo_url = updates.logoUrl;
          if (updates.conventionCollective) updateData.convention_collective = updates.conventionCollective;
          if (updates.siret) updateData.siret = updates.siret;
          if (updates.apeCode) updateData.ape_code = updates.apeCode;
          if (updates.phone) updateData.phone = updates.phone;
          if (updates.address) updateData.address = updates.address;
          
          console.log('💾 Données finales pour Supabase:', updateData);
          
          // Effectuer la mise à jour avec gestion RLS
          console.log('🔐 Vérification permissions admin...');
          
          // Vérifier d'abord si l'utilisateur est admin
          const { data: isAdminData, error: adminError } = await supabase.rpc('is_admin');
          
          if (adminError) {
            console.error('❌ Erreur vérification admin:', adminError);
            reject(new Error(`Erreur vérification permissions: ${adminError.message}`));
            return;
          }
          
          if (!isAdminData) {
            console.error('❌ Utilisateur non admin');
            reject(new Error('Permissions insuffisantes: seuls les administrateurs peuvent modifier les entreprises'));
            return;
          }
          
          console.log('✅ Utilisateur admin confirmé, mise à jour...');
          
          // Effectuer la mise à jour
          const { data, error, count } = await supabase
            .from('companies')
            .update(updateData)
            .eq('id', companyId)
            .select()
            .maybeSingle();

          if (error) {
            console.error('❌ ERREUR SUPABASE DÉTAILLÉE:', error);
            console.error('❌ Code erreur:', error.code);
            console.error('❌ Message:', error.message);
            console.error('❌ Détails:', error.details);
            console.error('❌ Hint:', error.hint);
            
            // Messages d'erreur spécifiques
            if (error.code === 'PGRST116') {
              reject(new Error('Aucune ligne mise à jour - Vérifiez les permissions RLS ou l\'ID de l\'entreprise'));
            } else if (error.code === '42501') {
              reject(new Error('Permissions insuffisantes - Seuls les administrateurs peuvent modifier les entreprises'));
            } else {
              reject(new Error(`Erreur Supabase (${error.code}): ${error.message}`));
            }
            return;
          }
          
          console.log('✅ SAUVEGARDE RÉUSSIE:', data);
          console.log('📊 Nombre de lignes mises à jour:', count || 'Non spécifié');
          
          if (!data && count === 0) {
            console.error('❌ Aucune ligne mise à jour - Problème de permissions RLS');
            reject(new Error('Aucune ligne mise à jour - Vérifiez que vous êtes administrateur'));
            return;
          }
          
          // Mettre à jour l'état local
          setCompanies(prev => prev.map(company => 
            company.id === companyId ? { 
              ...company, 
              ...updates,
              updatedAt: new Date().toISOString()
            } : company
          ));
          
          console.log('✅ État local mis à jour');
          resolve();
        } else {
          console.log('⚠️ Supabase non configuré - Mise à jour locale seulement');
          
          // Mettre à jour l'état local même sans Supabase
          setCompanies(prev => prev.map(company => 
            company.id === companyId ? { 
              ...company, 
              ...updates,
              updatedAt: new Date().toISOString()
            } : company
          ));
          
          resolve();
        }
      } catch (error) {
        console.error('❌ EXCEPTION:', error);
        reject(error);
      }
    });
  };

  const addCompany = async (company: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
    try {
      const now = new Date().toISOString();
      
      // Ajouter à Supabase
      const { data, error } = await supabase
        .from('companies')
        .insert({
          name: company.name,
          email: company.email,
          admin_email: company.adminEmail,
          siret: company.siret,
          ape_code: company.apeCode,
          phone: company.phone,
          address: company.address,
          logo_url: company.logoUrl
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Erreur création entreprise:', error);
        throw new Error('Erreur lors de la création de l\'entreprise');
      }

      // Ajouter localement
      const newCompany: Company = {
        id: data.id,
        name: data.name,
        email: data.email || '',
        adminEmail: data.admin_email || '',
        logoUrl: data.logo_url,
        siret: data.siret || '',
        apeCode: data.ape_code || '',
        phone: data.phone || '',
        address: data.address || null,
        conventionCollective: data.convention_collective || '',
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };

      setCompanies(prev => [...prev, newCompany]);
      console.log('✅ Entreprise créée:', newCompany.name);
    } catch (error) {
      console.error('❌ Erreur addCompany:', error);
      throw error;
    }
  };

  return (
    <Ctx.Provider value={{ 
      user, 
      session, 
      signIn, 
      signOut, 
      isAdmin,
      currentUser,
      companies,
      employees,
      projects,
      loading,
      login,
      logout,
      updateEmployee,
      addEmployee,
      archiveEmployee,
      restoreEmployee,
      deleteEmployee,
      updateProject,
      addProject,
      archiveProject,
      restoreProject,
      deleteProject,
      syncData,
      getProjectsForCompany,
      updateCompany,
      addCompany
    }}>
      {children}
    </Ctx.Provider>
  );
}