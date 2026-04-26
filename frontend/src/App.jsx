import { Suspense, lazy } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import InstructorRoute from './components/InstructorRoute';
import ProtectedRoute from './components/ProtectedRoute';
import ConfirmProvider from './components/ConfirmProvider';
import { AuthProvider } from './context/AuthContext';

const Home = lazy(() => import('./pages/Home.jsx'));
const Login = lazy(() => import('./pages/auth/Login.jsx'));
const Register = lazy(() => import('./pages/auth/Register.jsx'));
const CourseCatalog = lazy(() => import('./pages/student/CourseCatalog.jsx'));
const CourseDetail = lazy(() => import('./pages/student/CourseDetail.jsx'));
const MyCourses = lazy(() => import('./pages/student/MyCourses.jsx'));
const CoursePlayer = lazy(() => import('./pages/student/CoursePlayer.jsx'));
const MyCertificates = lazy(() => import('./pages/student/MyCertificates.jsx'));
const CertificateView = lazy(() => import('./pages/student/CertificateView.jsx'));
const CertificateVerify = lazy(() => import('./pages/student/CertificateVerify.jsx'));
const QuizPlayer = lazy(() => import('./pages/student/QuizPlayer.jsx'));
const CourseCompleted = lazy(() => import('./pages/student/CourseCompleted.jsx'));
const InstructorDashboard = lazy(() => import('./pages/instructor/InstructorDashboard.jsx'));
const CourseForm = lazy(() => import('./pages/instructor/CourseForm.jsx'));
const CourseBuilder = lazy(() => import('./pages/instructor/CourseBuilder.jsx'));
const QuizBuilder = lazy(() => import('./pages/instructor/QuizBuilder.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));

const App = () => {
  return (
    <AuthProvider>
      <ConfirmProvider>
      <BrowserRouter>
        <div className="app-shell">
          <Navbar />

          <div className="app-shell__main">
            <Suspense
              fallback={
                <div
                  style={{
                    minHeight: 'calc(100vh - 64px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div className="spinner" />
                </div>
              }
            >
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/courses" element={<CourseCatalog />} />
                <Route path="/courses/:id" element={<CourseDetail />} />
                <Route path="/verify/:certificateId" element={<CertificateVerify />} />

                <Route
                  path="/my-courses"
                  element={
                    <ProtectedRoute>
                      <MyCourses />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/learn/:courseId"
                  element={
                    <ProtectedRoute>
                      <CoursePlayer />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/learn/:courseId/quiz/:quizId"
                  element={
                    <ProtectedRoute>
                      <QuizPlayer />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/learn/:courseId/complete"
                  element={
                    <ProtectedRoute>
                      <CourseCompleted />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/certificates"
                  element={
                    <ProtectedRoute>
                      <MyCertificates />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/certificates/:certificateId"
                  element={
                    <ProtectedRoute>
                      <CertificateView />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/instructor"
                  element={
                    <InstructorRoute>
                      <InstructorDashboard />
                    </InstructorRoute>
                  }
                />
                <Route
                  path="/instructor/courses/new"
                  element={
                    <InstructorRoute>
                      <CourseForm />
                    </InstructorRoute>
                  }
                />
                <Route
                  path="/instructor/courses/:id/edit"
                  element={
                    <InstructorRoute>
                      <CourseForm />
                    </InstructorRoute>
                  }
                />
                <Route
                  path="/instructor/courses/:id/build"
                  element={
                    <InstructorRoute>
                      <CourseBuilder />
                    </InstructorRoute>
                  }
                />
                <Route
                  path="/instructor/courses/:id/quiz/:moduleId"
                  element={
                    <InstructorRoute>
                      <QuizBuilder />
                    </InstructorRoute>
                  }
                />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </div>

          <Footer />
        </div>
      </BrowserRouter>
      </ConfirmProvider>
    </AuthProvider>
  );
};

export default App;
