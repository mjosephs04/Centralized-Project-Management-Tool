import React from "react";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from "./pages/LoginPage";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";
import CreateAccountPage from "./pages/CreateAccountPage";
import RegisterWithTokenPage from "./pages/RegisterWithTokenPage";
import HomePage from "./pages/Home"
import ProjectsPage from "./pages/ProjectsPage";
import CreateProjectPage from "./pages/CreateProjectsPage";
import SingleProjectPage from "./pages/SingleProjectPage";
import ProfilePage from "./pages/ProfilePage"
import RouteProtector from "./components/RouteProtector";
import LoginDistributionPage from "./pages/LoginDistribution";
import RoleProtector from "./components/RoleProtector";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/create-account" element={<CreateAccountPage />} />
        <Route path="/register" element={<RegisterWithTokenPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        
        <Route path="/profile" element={<RouteProtector>{<ProfilePage />}</RouteProtector>} />
        <Route path="/projects" element={<RouteProtector>{<ProjectsPage />}</RouteProtector>} />
        <Route path="/projects/create" element={<RouteProtector>{<CreateProjectPage />}</RouteProtector>} />
        <Route path="/projects/:projectId" element={<RouteProtector>{<SingleProjectPage />}</RouteProtector>} />
        <Route path="login-distribution" element={<RouteProtector><RoleProtector allowedRoles={['project_manager']}>{<LoginDistributionPage />}</RoleProtector></RouteProtector>} />
      </Routes>
    </Router>
  );
};

export default App;