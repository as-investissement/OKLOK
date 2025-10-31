import React from 'react';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { TimesheetProvider } from './context/TimesheetContext';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginForm from './components/LoginForm';
import Dashboard from './pages/Dashboard';
import CompanyDashboard from './pages/CompanyDashboard';
import TimesheetList from './pages/TimesheetList';
import TimesheetDetail from './pages/TimesheetDetail';
import AdminApprovals from './pages/AdminApprovals';
import EmployeeList from './pages/EmployeeList';
import ProjectList from './pages/ProjectList';
import Recapitulatif from './pages/Recapitulatif';
import Archives from './pages/Archives';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import CompaniesList from './pages/CompaniesList';
import CalendarPage from './pages/Calendar';
import InvitationManagement from './pages/InvitationManagement';
import Documents from './pages/Documents';
import Messages from './pages/Messages';
import EmailRedirect from './pages/EmailRedirect';
import ActivateAccount from './pages/ActivateAccount';
import TestActivation from './pages/TestActivation';
import ActivationDebug from './pages/ActivationDebug';
import ActivationStep1Debug from './pages/ActivationStep1Debug';
import ResetPassword from './pages/ResetPassword';
import AdminDiagnostic from './pages/AdminDiagnostic';
import UserLoginDiagnostic from './pages/UserLoginDiagnostic';
import EmployeeTimesheetView from './pages/EmployeeTimesheetView';
import CGU from './pages/CGU';

// Composant pour rediriger selon le rôle
const RoleBasedHome = () => {
  const { isAdmin } = useAuth();
  return isAdmin ? <Dashboard /> : <CalendarPage />;
};


// Composant d'erreur pour les routes
const ErrorBoundary = ({ error }: { error: Error }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Une erreur est survenue</h1>
        <p className="text-gray-600 mb-4">{error.message}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Recharger la page
        </button>
      </div>
    </div>
  );
};

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginForm />,
    errorElement: <ErrorBoundary error={new Error('Erreur de chargement de la page de connexion')} />
  },
  {
    path: '/email-redirect',
    element: <EmailRedirect />,
    errorElement: <ErrorBoundary error={new Error('Erreur de chargement de la redirection email')} />
  },
  {
    path: '/activate-account',
    element: <ActivateAccount />,
    errorElement: <ErrorBoundary error={new Error('Erreur de chargement de l\'activation de compte')} />
  },
  {
    path: '/reset-password',
    element: <ResetPassword />,
    errorElement: <ErrorBoundary error={new Error('Erreur de chargement de la réinitialisation de mot de passe')} />
  },
  {
    path: '/test-activation',
    element: <TestActivation />,
    errorElement: <ErrorBoundary error={new Error('Erreur de chargement du test d\'activation')} />
  },
  {
    path: '/activation-debug',
    element: <ActivationDebug />,
    errorElement: <ErrorBoundary error={new Error('Erreur de chargement du diagnostic d\'activation')} />
  },
  {
    path: '/activation-step1-debug',
    element: <ActivationStep1Debug />,
    errorElement: <ErrorBoundary error={new Error('Erreur de chargement du diagnostic étape par étape')} />
  },
  {
    path: '/activation-step1-debug',
    element: <ActivationStep1Debug />,
    errorElement: <ErrorBoundary error={new Error('Erreur de chargement du diagnostic étape par étape')} />
  },
  {
    path: '/admin-diagnostic',
    element: <AdminDiagnostic />,
    errorElement: <ErrorBoundary error={new Error('Erreur de chargement du diagnostic admin')} />
  },
  {
    path: '/user-diagnostic',
    element: <UserLoginDiagnostic />,
    errorElement: <ErrorBoundary error={new Error('Erreur de chargement du diagnostic utilisateur')} />
  },
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorBoundary error={new Error('Erreur de chargement de l\'application')} />,
    children: [
      {
        path: '/employee-timesheet/:employeeId',
        element: <EmployeeTimesheetView />,
        errorElement: <ErrorBoundary error={new Error('Erreur de chargement de la feuille de temps du salarié')} />
      },
      {
        path: '/',
        element: <RoleBasedHome />,
        errorElement: <ErrorBoundary error={new Error('Erreur de chargement de la page d\'accueil')} />
      },
      {
        path: '/dashboard',
        element: <Dashboard />,
        errorElement: <ErrorBoundary error={new Error('Erreur de chargement du tableau de bord')} />
      },
      {
        path: '/calendar',
        element: <CalendarPage />,
        errorElement: <ErrorBoundary error={new Error('Erreur de chargement du calendrier')} />
      },
      {
        path: '/company/:companyId',
        element: <CompanyDashboard />,
        errorElement: <ErrorBoundary error={new Error('Erreur de chargement de l\'entreprise')} />
      },
      {
        path: '/timesheets',
        element: <TimesheetList />,
        errorElement: <ErrorBoundary error={new Error('Erreur de chargement des feuilles de temps')} />
      },
      {
        path: '/timesheets/:id',
        element: <TimesheetDetail />,
        errorElement: <ErrorBoundary error={new Error('Erreur de chargement de la feuille de temps')} />
      },
      {
        path: '/approvals',
        element: <AdminApprovals />,
        errorElement: <ErrorBoundary error={new Error('Erreur de chargement des approbations')} />
      },
      {
        path: '/recapitulatif',
        element: <Recapitulatif />,
        errorElement: <ErrorBoundary error={new Error('Erreur de chargement du récapitulatif')} />
      },
      {
        path: '/employees',
        element: <EmployeeList />,
        errorElement: <ErrorBoundary error={new Error('Erreur de chargement des employés')} />
      },
      {
        path: '/projects',
        element: <ProjectList />,
        errorElement: <ErrorBoundary error={new Error('Erreur de chargement des projets')} />
      },
      {
        path: '/archives',
        element: <Archives />,
        errorElement: <ErrorBoundary error={new Error('Erreur de chargement des archives')} />
      },
      {
        path: '/profile',
        element: <Profile />,
        errorElement: <ErrorBoundary error={new Error('Erreur de chargement du profil')} />
      },
      {
        path: '/settings',
        element: <Settings />,
        errorElement: <ErrorBoundary error={new Error('Erreur de chargement des paramètres')} />
      },
      {
        path: '/companies',
        element: <CompaniesList />,
        errorElement: <ErrorBoundary error={new Error('Erreur de chargement des entreprises')} />
      },
      {
        path: '/invitations',
        element: <InvitationManagement />,
        errorElement: <ErrorBoundary error={new Error('Erreur de chargement des invitations')} />
      },
      {
        path: '/documents',
        element: <Documents />,
        errorElement: <ErrorBoundary error={new Error('Erreur de chargement des documents')} />
      },
      {
        path: '/messages',
        element: <Messages />,
        errorElement: <ErrorBoundary error={new Error('Erreur de chargement des messages')} />
      },
      {
        path: '/cgu',
        element: <CGU />,
        errorElement: <ErrorBoundary error={new Error('Erreur de chargement des CGU')} />
      }
    ]
  }
], {
  future: {
    v7_skipActionErrorRevalidation: true,
  },
});

function App() {
  return (
    <AuthProvider>
      <TimesheetProvider>
        <div className="min-h-screen bg-white">
          <RouterProvider router={router} />
        </div>
      </TimesheetProvider>
    </AuthProvider>
  );
}

export default App;