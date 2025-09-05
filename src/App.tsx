import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';
import { QuestionProvider } from './contexts/QuestionContext';
import { QuizSessionProvider } from './contexts/QuizSessionContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { NotificationProvider } from './contexts/NotificationContext';
import { Landing } from './pages/Landing';
import { Documentation } from './pages/Documentation';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { FeaturesOverview } from './pages/FeaturesOverview';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { Dashboard } from './pages/Dashboard';
import { Settings } from './pages/Settings';
import { Analytics } from './pages/Analytics';
import { Billing } from './pages/Billing';
import { BillingSuccess } from './pages/billing/Success';
import { Team } from './pages/Team';
import { Invitations } from './pages/Invitations';
import { InvitationAccept } from './pages/InvitationAccept';
import { Quiz } from './pages/Quiz';
import { QuickStartQuiz } from './pages/QuickStartQuiz';
import { CreateOwnQuiz } from './pages/CreateOwnQuiz';
import { StudyScheduleQuiz } from './pages/StudyScheduleQuiz';
import { Achievements } from './pages/Achievements';
import { Schedule } from './pages/Schedule';
import { Leaderboard } from './pages/Leaderboard';
import { AdminPanel } from './pages/admin/AdminPanel';
import { UserManagement } from './pages/admin/UserManagement';
import { QuestionManagement } from './pages/admin/QuestionManagement';
import { PlanManagement } from './pages/admin/PlanManagement';
import { AchievementManagement } from './pages/admin/AchievementManagement';
import { QuizRunner } from './components/quiz/QuizRunner';
import { IS_BETA_MODE } from './config/beta';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <QuestionProvider>
          <NotificationProvider>
          <QuizSessionProvider>
            <Router>
              <Routes>
                <Route path="/" element={IS_BETA_MODE ? <Navigate to="/login" replace /> : <Landing />} />
                <Route path="/documentation" element={IS_BETA_MODE ? <Navigate to="/login" replace /> : <Documentation />} />
                <Route path="/features" element={IS_BETA_MODE ? <Navigate to="/login" replace /> : <FeaturesOverview />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={IS_BETA_MODE ? <Navigate to="/login" replace /> : <Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                
                {/* Public invitation acceptance route */}
                <Route path="/invitations/accept" element={<InvitationAccept />} />
                
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                
                <Route path="/invitations" element={
                  <ProtectedRoute>
                    <Invitations />
                  </ProtectedRoute>
                } />
                
                <Route path="/analytics" element={
                  <ProtectedRoute allowedTeamRoles={['owner', 'admin']}>
                    <Analytics />
                  </ProtectedRoute>
                } />
                
                <Route path="/team" element={
                  <ProtectedRoute allowedTeamRoles={['owner', 'admin']}>
                    <Team />
                  </ProtectedRoute>
                } />
                
                <Route path="/quiz" element={
                  <ProtectedRoute allowedTeamRoles={['owner', 'admin', 'member']}>
                    <Quiz />
                  </ProtectedRoute>
                } />
                
                <Route path="/quiz/quick-start" element={
                  <ProtectedRoute allowedTeamRoles={['owner', 'admin', 'member']}>
                    <QuickStartQuiz />
                  </ProtectedRoute>
                } />
                
                <Route path="/quiz/create-own" element={
                  <ProtectedRoute allowedTeamRoles={['owner', 'admin', 'member']}>
                    <CreateOwnQuiz />
                  </ProtectedRoute>
                } />
                
                <Route path="/quiz/study-assignment/:assignmentId" element={
                  <ProtectedRoute allowedTeamRoles={['owner', 'admin', 'member']}>
                    <StudyScheduleQuiz />
                  </ProtectedRoute>
                } />
                
                <Route path="/quiz/runner/:quizSessionId" element={
                  <ProtectedRoute allowedTeamRoles={['owner', 'admin', 'member']}>
                    <QuizRunner />
                  </ProtectedRoute>
                } />
                
                <Route path="/schedule" element={
                  <ProtectedRoute allowedTeamRoles={['owner', 'admin', 'member']}>
                    <Schedule />
                  </ProtectedRoute>
                } />
                
                <Route path="/achievements" element={
                  <ProtectedRoute allowedTeamRoles={['owner', 'admin', 'member']}>
                    <Achievements />
                  </ProtectedRoute>
                } />
                
                <Route path="/leaderboard" element={
                  <ProtectedRoute allowedTeamRoles={['owner', 'admin', 'member']}>
                    <Leaderboard />
                  </ProtectedRoute>
                } />
                
                <Route path="/billing" element={
                  <ProtectedRoute allowedTeamRoles={['owner']}>
                    <Billing />
                  </ProtectedRoute>
                } />
                
                <Route path="/billing/success" element={
                  <BillingSuccess />
                } />
                
                <Route path="/settings" element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                } />
                
                <Route path="/admin" element={
                  <ProtectedRoute requireAdmin>
                    <AdminPanel />
                  </ProtectedRoute>
                } />
                
                <Route path="/admin/users" element={
                  <ProtectedRoute requireAdmin>
                    <UserManagement />
                  </ProtectedRoute>
                } />
                
                <Route path="/admin/questions" element={
                  <ProtectedRoute requireAdmin>
                    <QuestionManagement />
                  </ProtectedRoute>
                } />
                
                <Route path="/admin/plans" element={
                  <ProtectedRoute requireAdmin>
                    <PlanManagement />
                  </ProtectedRoute>
                } />
                
                <Route path="/admin/achievements" element={
                  <ProtectedRoute requireAdmin>
                    <AchievementManagement />
                  </ProtectedRoute>
                } />
                
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Router>
          </QuizSessionProvider>
          </NotificationProvider>
        </QuestionProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;