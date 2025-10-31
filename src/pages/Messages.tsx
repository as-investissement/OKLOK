import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTimesheets } from '../context/TimesheetContext';
import { ArrowLeft, Mail, AlertTriangle, Calendar, MessageSquare, CheckCircle, ChevronDown, ChevronRight, User, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../utils/helpers';
import { supabase } from '../lib/supabaseClient';

interface Message {
  id: string;
  userId: string;
  type: 'rejection' | 'approval' | 'info';
  title: string;
  content: string;
  date: string;
  read: boolean;
  from: string;
  fromRole: 'admin' | 'system';
}

const Messages: React.FC = () => {
  const { currentUser, isAdmin, employees, user, companies } = useAuth();
  const { userTimesheets, timesheets } = useTimesheets();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMessages, setExpandedMessages] = useState<string[]>([]);

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear().toString();
  const currentMonth = (currentDate.getMonth() + 1).toString();

  const [selectedYear, setSelectedYear] = useState<string>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      loadMessages();
    }
  }, [currentUser, userTimesheets]);

  // Écouter les changements en temps réel sur les entrées refusées (pour les salariés)
  useEffect(() => {
    if (!currentUser || isAdmin) return;

    console.log('🔔 Mise en place de l\'écoute en temps réel des refus pour:', currentUser.name);

    // Créer une subscription pour écouter les changements sur timesheet_entries
    const subscription = supabase
      .channel('rejected-entries-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'timesheet_entries',
          filter: `status=eq.rejected`
        },
        (payload) => {
          console.log('🔔 Changement détecté sur une entrée:', payload);

          // Vérifier si l'entrée appartient à une feuille de temps de cet utilisateur
          const updatedEntry = payload.new;
          const belongsToUser = userTimesheets.some(timesheet =>
            timesheet.entries.some(entry => entry.id === updatedEntry.id)
          );

          if (belongsToUser) {
            console.log('🔔 Refus reçu pour cet utilisateur, rechargement des messages...');
            // Recharger les messages après un court délai pour s'assurer que le contexte est à jour
            setTimeout(() => {
              loadMessages();
              // Émettre un événement global pour mettre à jour les données
              window.dispatchEvent(new Event('globalTimesheetUpdate'));
            }, 500);
          }
        }
      )
      .subscribe();

    // Nettoyer la subscription au démontage
    return () => {
      console.log('🔔 Nettoyage de l\'écoute en temps réel');
      subscription.unsubscribe();
    };
  }, [currentUser, isAdmin, userTimesheets]);

  const loadMessages = () => {
    if (!currentUser) return;

    try {
      console.log('📨 === CHARGEMENT MESSAGES ===', isAdmin ? 'ADMIN' : 'SALARIÉ');
      console.log('👤 Utilisateur:', currentUser.name);
      
      if (isAdmin) {
        // ADMIN : Charger directement depuis timesheet_entries
        loadAdminMessagesFromSupabase();
        
      } else {
        // SALARIÉ : Logique existante inchangée
        console.log('📨 Mode SALARIÉ : Chargement messages reçus');
        console.log('📋 Feuilles de temps:', userTimesheets.length);
        
        // Charger les messages lus depuis localStorage
        const readMessagesKey = `read-messages-${currentUser.id}`;
        const readMessages = JSON.parse(localStorage.getItem(readMessagesKey) || '[]');
        
        // Charger TOUTES les entrées refusées directement depuis les feuilles de temps
        const rejectedMessages: Message[] = [];
        
        userTimesheets.forEach(timesheet => {
          console.log('📋 Traitement feuille:', timesheet.id, 'avec', timesheet.entries?.length || 0, 'entrées');
          timesheet.entries.forEach(entry => {
            if (entry.status === 'rejected' && entry.rejectionReason) {
              console.log('❌ Entrée refusée trouvée:', entry.date, '-', entry.rejectionReason);
              const messageId = `rejected-${entry.id}`;
              rejectedMessages.push({
                id: messageId,
                userId: currentUser.id,
                type: 'rejection',
                title: `Refus du ${formatDate(entry.date)}`,
                content: entry.rejectionReason,
                date: entry.decisionAt || entry.updatedAt,
                read: readMessages.includes(messageId), // Vérifier si déjà lu
                from: 'Administrateur',
                fromRole: 'admin'
              });
            }
          });
        });
        
        setMessages(rejectedMessages);
        console.log('📨 Messages de refus chargés:', rejectedMessages.length);
      }
      
    } catch (error) {
      console.error('Erreur chargement messages:', error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAdminMessagesFromSupabase = async () => {
    try {
      console.log('📨 === CHARGEMENT ADMIN DEPUIS SUPABASE ===');
      console.log('👤 Admin ID:', currentUser?.id);
      console.log('🔑 User ID:', user?.id);
      
      // Charger directement depuis timesheet_entries
      const { data: rejectedEntries, error } = await supabase
        .from('timesheet_entries')
        .select('*')
        .eq('status', 'rejected')
        .not('rejection_reason', 'is', null)
        .order('decision_at', { ascending: false });

      if (error) {
        console.error('❌ Erreur chargement entrées refusées:', error);
        setMessages([]);
        return;
      }

      console.log('📊 Entrées refusées trouvées:', rejectedEntries?.length || 0);
      
      if (!rejectedEntries || rejectedEntries.length === 0) {
        setMessages([]);
        return;
      }

      // Filtrer seulement les refus effectués par cet admin
      const adminRejections = rejectedEntries.filter(entry => 
        entry.decision_by === currentUser?.id || 
        entry.decision_by === user?.id
      );

      console.log('📊 Refus effectués par cet admin:', adminRejections.length);

      // Créer les messages admin
      const adminMessages: Message[] = adminRejections.map(entry => {
        // Trouver le salarié correspondant
        const employee = employees.find(emp => emp.id === entry.user_id);
        const employeeName = employee?.name || 'Salarié inconnu';
        
        // Séparer nom et prénom
        const nameParts = employeeName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        return {
          id: `admin-rejection-${entry.id}`,
          userId: currentUser.id,
          type: 'rejection' as const,
          title: `Refus envoyé à ${firstName} ${lastName.toUpperCase()}`,
          content: `Date refusée: ${formatDate(entry.date)}\nRaison: ${entry.rejection_reason}\nDate du refus: ${entry.decision_at ? formatDate(entry.decision_at) : 'Non renseignée'}`,
          date: entry.decision_at || entry.updated_at,
          read: true,
          from: `Refusé à ${firstName} ${lastName.toUpperCase()}`,
          fromRole: 'admin' as const
        };
      });

      setMessages(adminMessages);
      console.log('✅ Messages admin chargés depuis Supabase:', adminMessages.length);
      
    } catch (error) {
      console.error('❌ Exception chargement admin messages:', error);
      setMessages([]);
    }
  };

  // Fonction pour obtenir les entreprises ayant des refus
  const getCompaniesWithRejections = () => {
    if (!isAdmin || !messages.length) return [];
    
    const companyIds = new Set<string>();
    
    messages.forEach(message => {
      // Extraire le nom du salarié depuis le titre "Refus envoyé à Jean MARTIN"
      const employeeName = message.title.replace('Refus envoyé à ', '');
      const employee = employees.find(emp => emp.name === employeeName);
      if (employee?.companyId) {
        companyIds.add(employee.companyId);
      }
    });
    
    return companies.filter(company => companyIds.has(company.id));
  };

  const markAsRead = (messageId: string) => {
    if (!currentUser || isAdmin) return; // Les admins n'ont pas besoin de marquer comme lu

    // Marquer comme lu dans l'état local
    const updatedMessages = messages.map(msg =>
      msg.id === messageId ? { ...msg, read: true } : msg
    );

    setMessages(updatedMessages);

    // Sauvegarder la liste des messages lus dans localStorage (seulement pour les salariés)
    const readMessagesKey = `read-messages-${currentUser.id}`;
    const readMessages = JSON.parse(localStorage.getItem(readMessagesKey) || '[]');

    if (!readMessages.includes(messageId)) {
      readMessages.push(messageId);
      localStorage.setItem(readMessagesKey, JSON.stringify(readMessages));
      console.log('📨 Message marqué comme lu:', messageId);

      // Notifier le Navbar que les messages ont changé
      window.dispatchEvent(new Event('messagesUpdated'));
    }
  };

  const toggleMessage = (messageId: string) => {
    setExpandedMessages(prev => 
      prev.includes(messageId) 
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId]
    );
  };

  // Obtenir les années disponibles à partir des messages
  const availableYears = Array.from(new Set(
    messages.map(msg => new Date(msg.date).getFullYear())
  )).sort((a, b) => b - a);

  // Filtrer les messages selon les critères sélectionnés
  const filteredMessages = messages.filter(msg => {
    if (isAdmin) {
      // Extraire le nom du salarié depuis le titre "Refus envoyé à Jean MARTIN"
      const employeeName = msg.title.replace('Refus envoyé à ', '');

      // Filtrer par nom/prénom
      if (searchTerm.trim()) {
        const nameMatch = employeeName.toLowerCase().includes(searchTerm.toLowerCase());
        if (!nameMatch) return false;
      }

      // Filtrer par entreprise du salarié refusé
      if (selectedCompany !== 'all') {
        const employee = employees.find(emp => emp.name === employeeName);
        const companyMatch = employee?.companyId === selectedCompany;
        if (!companyMatch) return false;
      }

      // Filtrer par date de l'entrée refusée (extraite du contenu)
      const dateMatch = msg.content.match(/Date refusée: (\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        const entryDate = new Date(dateMatch[1]);
        const msgYear = entryDate.getFullYear();
        const msgMonth = entryDate.getMonth() + 1;

        const yearMatch = selectedYear === 'all' || msgYear.toString() === selectedYear;
        const monthMatch = selectedMonth === 'all' || msgMonth.toString() === selectedMonth;

        if (!yearMatch || !monthMatch) return false;
      }

      return true;
    } else {
      // Pour salarié : logique existante inchangée
      const msgDate = new Date(msg.date);
      const msgYear = msgDate.getFullYear();
      const msgMonth = msgDate.getMonth() + 1;
      
      const yearMatch = selectedYear === 'all' || msgYear.toString() === selectedYear;
      const monthMatch = selectedMonth === 'all' || msgMonth.toString() === selectedMonth;
      
      return yearMatch && monthMatch;
    }
  });

  const companiesWithRejections = getCompaniesWithRejections();

  const unreadCount = isAdmin ? 0 : messages.filter(msg => !msg.read).length; // Pas de badge pour admin

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center transition-colors duration-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement des messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* En-tête */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/')}
              className="mr-4 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-blue-600 transition-colors duration-200 group"
            >
              <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                {isAdmin ? 'Mes échanges' : 'Mes messages'}
              </h1>
              {isAdmin && (
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                  Historique de vos décisions de refus
                </p>
              )}
            </div>
          </div>

          {/* Badge de messages non lus (seulement pour salariés) */}
          {!isAdmin && unreadCount > 0 && (
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center justify-center px-3 py-1 text-sm font-bold leading-none text-white bg-red-600 rounded-full">
                {unreadCount}
              </span>
            </div>
          )}
        </div>
        {/* Filtres par mois - UNIQUEMENT pour les salariés */}
        {!isAdmin ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 mb-4 border border-gray-100 dark:border-gray-700 transition-colors duration-200">
            {/* Filtres compacts sur une ligne */}
            <div className="flex items-center space-x-2">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors duration-200"
              >
                <option value="all">Toutes</option>
                {availableYears.map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors duration-200"
              >
                <option value="all">Tous</option>
                <option value="1">Janvier</option>
                <option value="2">Février</option>
                <option value="3">Mars</option>
                <option value="4">Avril</option>
                <option value="5">Mai</option>
                <option value="6">Juin</option>
                <option value="7">Juillet</option>
                <option value="8">Août</option>
                <option value="9">Septembre</option>
                <option value="10">Octobre</option>
                <option value="11">Novembre</option>
                <option value="12">Décembre</option>
              </select>
              
              {/* Bouton reset compact */}
              {(selectedYear !== 'all' || selectedMonth !== 'all') && (
                <button
                  onClick={() => {
                    setSelectedYear('all');
                    setSelectedMonth('all');
                  }}
                  className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 border border-blue-300 rounded hover:bg-blue-50"
                >
                  ✕
                </button>
              )}
            </div>
            
            {/* Indicateur compact */}
            {(selectedYear !== 'all' || selectedMonth !== 'all') && (
              <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 text-center">
                {filteredMessages.length} message{filteredMessages.length > 1 ? 's' : ''}
              </div>
            )}
          </div>
        ) : (
          /* Filtres intelligents pour admin */
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6 border border-gray-100 dark:border-gray-700 transition-colors duration-200">
            <div className="flex items-center mb-4">
              <MessageSquare className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-2" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Filtres de recherche</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Filtre par entreprise */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Entreprise
                </label>
                <select
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-colors duration-200"
                >
                  <option value="all">Toutes les entreprises</option>
                  {companies.map(company => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Recherche nom/prénom */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nom/Prénom
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher un salarié..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-colors duration-200"
                />
              </div>
              
              {/* Filtre par année du refus */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Année
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-colors duration-200"
                >
                  <option value="all">Toutes les années</option>
                  {availableYears.map(year => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Filtre par mois du refus */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Mois
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-colors duration-200"
                >
                  <option value="all">Tous les mois</option>
                  <option value="1">Janvier</option>
                  <option value="2">Février</option>
                  <option value="3">Mars</option>
                  <option value="4">Avril</option>
                  <option value="5">Mai</option>
                  <option value="6">Juin</option>
                  <option value="7">Juillet</option>
                  <option value="8">Août</option>
                  <option value="9">Septembre</option>
                  <option value="10">Octobre</option>
                  <option value="11">Novembre</option>
                  <option value="12">Décembre</option>
                </select>
              </div>
              
              {/* Bouton reset */}
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSelectedCompany('all');
                    setSearchTerm('');
                    setSelectedYear('all');
                    setSelectedMonth('all');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200"
                >
                  Réinitialiser
                </button>
              </div>
            </div>
            
            {/* Indicateur de filtrage actif */}
            {(selectedCompany !== 'all' || searchTerm.trim() || selectedYear !== 'all' || selectedMonth !== 'all') && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-blue-600 dark:text-blue-400">
                  Filtres actifs : 
                  {selectedCompany !== 'all' && ` ${companies.find(c => c.id === selectedCompany)?.name}`}
                  {searchTerm.trim() && ` • "${searchTerm}"`}
                  {selectedYear !== 'all' && ` • ${selectedYear}`}
                  {selectedMonth !== 'all' && ` • ${['', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'][parseInt(selectedMonth)]}`}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {filteredMessages.length} résultat{filteredMessages.length > 1 ? 's' : ''}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        {filteredMessages.length > 0 ? (
          <div className="space-y-4">
            {filteredMessages
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((message) => {
                const isExpanded = expandedMessages.includes(message.id);
                
                return (
                <div 
                  key={message.id}
                  className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border-l-4 p-4 transition-colors duration-200 ${
                    isAdmin 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900' 
                      : !message.read 
                        ? 'border-red-500 bg-red-50 dark:bg-red-900' 
                        : 'border-red-500'
                  }`}
                  onClick={() => !isAdmin && markAsRead(message.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className={`p-2 rounded-full ${isAdmin ? 'bg-blue-100 dark:bg-blue-800' : 'bg-red-100 dark:bg-red-800'} transition-colors duration-200`}>
                          {isAdmin ? (
                            <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className={`text-base font-semibold ${isAdmin ? 'text-blue-800 dark:text-blue-200' : 'text-red-800 dark:text-red-200'}`}>
                            {message.title}
                          </h3>
                          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 space-x-2">
                            <span>{message.from}</span>
                            <span>•</span>
                            <span className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                             {new Date(message.date).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                        </div>
                        
                        {/* Flèche de dépliage à droite */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleMessage(message.id);
                          }}
                          className="flex-shrink-0 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                          )}
                        </button>
                      </div>
                      
                      {/* Contenu déplié - Raison du refus */}
                      {isExpanded && (
                        <div className="mt-3">
                          <div className={`border rounded-lg p-3 ${
                            isAdmin 
                              ? 'bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700' 
                              : 'bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-700'
                          } transition-colors duration-200`}>
                            <p className={`text-sm whitespace-pre-line ${
                              isAdmin ? 'text-blue-700 dark:text-blue-300' : 'text-red-700 dark:text-red-300'
                            }`}>
                              {message.content}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {!isAdmin && !message.read && (
                      <div className="flex-shrink-0 ml-4">
                        <div className="w-3 h-3 bg-red-500 dark:bg-red-400 rounded-full"></div>
                      </div>
                    )}
                  </div>
                </div>
                );
              })}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 text-center border border-gray-100 dark:border-gray-700 transition-colors duration-200">
            <div className={`p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center ${
              isAdmin ? 'bg-blue-100 dark:bg-blue-800' : 'bg-green-100 dark:bg-green-800'
            }`}>
              {isAdmin ? (
                <MessageSquare className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              ) : (
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              )}
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              {isAdmin ? 'Aucun refus effectué' : 'Aucun message'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {isAdmin 
                ? 'Vous n\'avez pas encore refusé d\'entrées de vos salariés.'
                : 'Vous n\'avez pas encore reçu de raisons de refus de votre administrateur.'
              }
            </p>
            
            {/* Informations sur le système de messages */}
            <div className={`border rounded-lg p-4 mt-6 ${
              isAdmin ? 'bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700' : 'bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700'
            } transition-colors duration-200`}>
              <div className="flex items-start">
                <MessageSquare className={`h-5 w-5 mt-0.5 mr-3 ${isAdmin ? 'text-blue-600 dark:text-blue-400' : 'text-blue-600 dark:text-blue-400'}`} />
                <div className="text-left">
                  <h4 className={`text-sm font-medium mb-2 ${isAdmin ? 'text-blue-800 dark:text-blue-200' : 'text-blue-800 dark:text-blue-200'}`}>
                    {isAdmin ? 'Historique de vos décisions' : 'Centre de communication des refus'}
                  </h4>
                  <div className={`text-sm space-y-1 ${isAdmin ? 'text-blue-700 dark:text-blue-300' : 'text-blue-700 dark:text-blue-300'}`}>
                    {isAdmin ? (
                      <>
                        <p>• Vous verrez ici l'historique de tous les refus que vous effectuez</p>
                        <p>• Chaque refus avec raison apparaîtra avec :</p>
                        <p className="ml-4">→ Le nom du salarié concerné</p>
                        <p className="ml-4">→ La date refusée</p>
                        <p className="ml-4">→ La raison que vous avez donnée</p>
                        <p>• Cela vous permet de vous rappeler vos décisions passées</p>
                      </>
                    ) : (
                      <>
                        <p>• Vous recevez un message ici seulement si :</p>
                        <p className="ml-4">→ L'administrateur refuse une de vos journées</p>
                        <p className="ml-4">→ Il explique pourquoi votre journée a été refusée</p>
                        <p className="ml-4">→ Vous pourrez alors corriger et re-soumettre</p>
                        <p>• Les approbations n'envoient pas de message - vous voyez juste le statut vert ✅</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;