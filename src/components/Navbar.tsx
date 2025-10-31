import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Menu, X, LogOut, User, Settings, Home, ClipboardList, CircleUser as UserCircle, Building2, FileText, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTimesheets } from '../context/TimesheetContext';

const Navbar: React.FC = () => {
  const { currentUser, logout, isAdmin } = useAuth();
  const { userTimesheets } = useTimesheets();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  // Vérifier s'il y a des messages non lus (seulement pour les salariés)
  useEffect(() => {
    if (!currentUser || isAdmin) {
      setHasUnreadMessages(false);
      return;
    }

    const checkUnreadMessages = () => {
      const readMessagesKey = `read-messages-${currentUser.id}`;
      const readMessages = JSON.parse(localStorage.getItem(readMessagesKey) || '[]');

      // Vérifier s'il y a des entrées refusées non lues
      let hasUnread = false;
      userTimesheets.forEach(timesheet => {
        timesheet.entries.forEach(entry => {
          if (entry.status === 'rejected' && entry.rejectionReason) {
            const messageId = `rejected-${entry.id}`;
            if (!readMessages.includes(messageId)) {
              hasUnread = true;
            }
          }
        });
      });

      setHasUnreadMessages(hasUnread);
    };

    checkUnreadMessages();

    // Écouter les mises à jour des messages
    const handleMessagesUpdate = () => {
      checkUnreadMessages();
    };

    // Écouter les mises à jour globales
    const handleGlobalUpdate = () => {
      checkUnreadMessages();
    };

    window.addEventListener('messagesUpdated', handleMessagesUpdate);
    window.addEventListener('globalTimesheetUpdate', handleGlobalUpdate);

    return () => {
      window.removeEventListener('messagesUpdated', handleMessagesUpdate);
      window.removeEventListener('globalTimesheetUpdate', handleGlobalUpdate);
    };
  }, [currentUser, userTimesheets, isAdmin]);

  if (!currentUser) return null;

  const handleLogout = () => {
    setDropdownOpen(false);
    logout();
  };
  
  return (
    <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-100 dark:border-gray-700 relative z-50 transition-colors duration-200 pt-4 md:pt-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-6">
            {/* Mon compte tout à gauche - Desktop */}
            <div className="hidden md:flex items-center mr-6">
              <div className="relative">
                <button
                  className="flex items-center space-x-2 p-2 border-2 border-blue-500 dark:border-blue-400 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 focus:ring-blue-500 cursor-pointer hover:bg-gray-50 dark:hover:bg-blue-900 transition-colors duration-200"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
                >
                  <User className="h-6 w-6 text-blue-500 dark:text-blue-400" />
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-32">
                      {currentUser.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-32">
                      {currentUser.department}
                    </div>
                  </div>
                </button>
                {!isAdmin && hasUnreadMessages && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-4 h-4 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"></span>
                )}
                {dropdownOpen && (
                  <div className="absolute left-0 w-56 mt-2 origin-top-left bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-100 dark:border-gray-700 z-50">
                    <div className="py-1">
                      {!isAdmin && (
                       <>
                        <Link
                          to="/"
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-blue-900 cursor-pointer transition-colors duration-200"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <Home className="h-4 w-4 mr-2" />
                          Mon calendrier
                        </Link>
                       </>
                      )}
                      <Link
                        to={isAdmin ? "/" : "/dashboard"}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-blue-900 cursor-pointer transition-colors duration-200"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <Home className="h-4 w-4 mr-2" />
                        {isAdmin ? "Tableau de bord" : "Mon tableau de bord"}
                      </Link>
                      {isAdmin && (
                        <Link
                          to="/recapitulatif"
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-blue-900 cursor-pointer transition-colors duration-200"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <ClipboardList className="h-4 w-4 mr-2" />
                          Récapitulatif
                        </Link>
                      )}
                      {isAdmin && (
                        <Link
                          to="/messages"
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-blue-900 cursor-pointer transition-colors duration-200"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Mes échanges
                        </Link>
                      )}
                      {!isAdmin && (
                        <Link
                          to="/timesheets"
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-blue-900 cursor-pointer transition-colors duration-200"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <ClipboardList className="h-4 w-4 mr-2" />
                          Mes feuilles d'heures
                        </Link>
                      )}
                      {!isAdmin && (
                        <Link
                          to="/messages"
                          className="flex items-center justify-between w-full px-4 py-2 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-blue-900 cursor-pointer transition-colors duration-200"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <div className="flex items-center">
                            <Mail className="h-4 w-4 mr-2" />
                            Messages
                          </div>
                          {hasUnreadMessages && (
                            <span className="inline-flex items-center justify-center w-2 h-2 bg-red-500 rounded-full"></span>
                          )}
                        </Link>
                      )}
                      {!isAdmin && (
                        <Link
                          to="/documents"
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-blue-900 cursor-pointer transition-colors duration-200"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Mes documents
                        </Link>
                      )}
                      {isAdmin && (
                        <Link
                          to="/companies"
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-blue-900 cursor-pointer transition-colors duration-200"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <Building2 className="h-4 w-4 mr-2" />
                          Mes entreprises
                        </Link>
                      )}
                      <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                      <Link
                        to="/profile"
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-blue-900 cursor-pointer transition-colors duration-200"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <UserCircle className="h-4 w-4 mr-2" />
                        Mes informations
                      </Link>
                      <Link
                        to="/settings"
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-blue-900 cursor-pointer transition-colors duration-200"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Paramètres
                      </Link>
                      {!isAdmin && (
                        <Link
                          to="/cgu"
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-blue-900 cursor-pointer transition-colors duration-200"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          CGU et Confidentialité
                        </Link>
                      )}
                      <button 
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-blue-900 cursor-pointer transition-colors duration-200"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Déconnexion
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* Menu mobile - Déplacé à gauche */}
          <div className="flex md:hidden items-center order-first">
            <div className="relative">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="flex flex-col items-center justify-center w-10 h-10 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 cursor-pointer transition-all duration-300 shadow-md hover:shadow-lg"
                style={{
                  background: 'radial-gradient(ellipse at center, white 0%, #e5e7eb 30%, #6b7280 70%, #374151 100%)',
                  border: '1px solid #d1d5db'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'radial-gradient(ellipse at center, #f9fafb 0%, #d1d5db 30%, #4b5563 70%, #1f2937 100%)';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'radial-gradient(ellipse at center, white 0%, #e5e7eb 30%, #6b7280 70%, #374151 100%)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <span className="sr-only">Ouvrir le menu</span>
                <div className="flex flex-col items-center justify-center space-y-1">
                  <span className="block w-5 h-0.5 bg-gray-800 rounded"></span>
                  <span className="block w-5 h-0.5 bg-gray-800 rounded"></span>
                  <span className="block w-5 h-0.5 bg-gray-800 rounded"></span>
                </div>
              </button>
              {!isAdmin && hasUnreadMessages && (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-4 h-4 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"></span>
              )}
            </div>
          </div>
          
          {/* Nom utilisateur mobile à droite */}
          <div className="flex md:hidden items-center flex-1 justify-end">
            <span className="font-bold text-lg tracking-tight text-gray-900 dark:text-gray-100 truncate pr-4">
              {currentUser?.name || 'Utilisateur'}
            </span>
          </div>
        </div>
      </div>
      
      {/* Menu mobile - AMÉLIORÉ AVEC OVERLAY */}
      {mobileMenuOpen && (
        <>
          {/* Overlay sombre pour fermer le menu */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-[9998] md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          ></div>

          {/* Menu flottant */}
          <div className="fixed top-20 left-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-[9999] md:hidden max-h-[calc(100vh-6rem)] overflow-y-auto">
            <div className="p-4 space-y-1">
              {/* Profil utilisateur en haut */}
              <div className="flex items-center px-3 py-3 rounded-md bg-gray-50 dark:bg-gray-700 mb-3">
                <User className="h-8 w-8 text-blue-500 dark:text-blue-400 mr-3 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{currentUser.name}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{currentUser.department}</div>
                </div>
              </div>
              
              {/* Navigation */}
              {!isAdmin && (
                <Link
                  to="/"
                  className="flex items-center w-full px-3 py-3 rounded-md text-base font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-blue-900 cursor-pointer transition-colors duration-200"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Home className="h-5 w-5 mr-3" />
                  Mon calendrier
                </Link>
              )}
              <Link
                to={isAdmin ? "/" : "/dashboard"}
                className="flex items-center w-full px-3 py-3 rounded-md text-base font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-blue-900 cursor-pointer transition-colors duration-200"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Home className="h-5 w-5 mr-3" />
                {isAdmin ? "Tableau de bord" : "Mon tableau de bord"}
              </Link>
              {isAdmin && (
                <Link
                  to="/recapitulatif"
                  className="flex items-center w-full px-3 py-3 rounded-md text-base font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-blue-900 cursor-pointer transition-colors duration-200"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <ClipboardList className="h-5 w-5 mr-3" />
                  Récapitulatif
                </Link>
              )}
              {isAdmin && (
                <Link
                  to="/messages"
                  className="flex items-center w-full px-3 py-3 rounded-md text-base font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-blue-900 cursor-pointer transition-colors duration-200"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Mail className="h-5 w-5 mr-3" />
                  Mes échanges
                </Link>
              )}
              {!isAdmin && (
                <Link
                  to="/timesheets"
                  className="flex items-center w-full px-3 py-3 rounded-md text-base font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-blue-900 cursor-pointer transition-colors duration-200"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <ClipboardList className="h-5 w-5 mr-3" />
                  Mes feuilles d'heures
                </Link>
              )}
              {!isAdmin && (
                <Link
                  to="/messages"
                  className="flex items-center justify-between w-full px-3 py-3 rounded-md text-base font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-blue-900 cursor-pointer transition-colors duration-200"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <div className="flex items-center">
                    <Mail className="h-5 w-5 mr-3" />
                    Messages
                  </div>
                  {hasUnreadMessages && (
                    <span className="inline-flex items-center justify-center w-2 h-2 bg-red-500 rounded-full"></span>
                  )}
                </Link>
              )}
              {!isAdmin && (
                <Link
                  to="/documents"
                  className="flex items-center w-full px-3 py-3 rounded-md text-base font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-blue-900 cursor-pointer transition-colors duration-200"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <FileText className="h-5 w-5 mr-3" />
                  Mes documents
                </Link>
              )}
              {isAdmin && (
                <Link
                  to="/companies"
                  className="flex items-center w-full px-3 py-3 rounded-md text-base font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-blue-900 cursor-pointer transition-colors duration-200"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Building2 className="h-5 w-5 mr-3" />
                  Mes entreprises
                </Link>
              )}
              
              {/* Séparateur */}
              <div className="border-t border-gray-200 dark:border-gray-700 my-3"></div>
              
              <Link
                to="/profile"
                className="flex items-center w-full px-3 py-3 rounded-md text-base font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-blue-900 cursor-pointer transition-colors duration-200"
                onClick={() => setMobileMenuOpen(false)}
              >
                <UserCircle className="h-5 w-5 mr-3" />
                Mes informations
              </Link>
              <Link
                to="/settings"
                className="flex items-center w-full px-3 py-3 rounded-md text-base font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-blue-900 cursor-pointer transition-colors duration-200"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Settings className="h-5 w-5 mr-3" />
                Paramètres
              </Link>
              
              {!isAdmin && (
                <Link
                  to="/cgu"
                  className="flex items-center w-full px-3 py-3 rounded-md text-base font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-blue-900 cursor-pointer transition-colors duration-200"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <FileText className="h-5 w-5 mr-3" />
                  CGU et Confidentialité
                </Link>
              )}
              
              {/* Déconnexion */}
              <button 
                onClick={handleLogout}
                className="flex items-center w-full px-3 py-3 rounded-md text-base font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer transition-colors duration-200"
              >
                <LogOut className="h-5 w-5 mr-3" />
                Déconnexion
              </button>
            </div>
          </div>
        </>
      )}
    </nav>
  );
};

export default Navbar;