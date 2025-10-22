import React from "react";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from "./pages/LoginPage";
import ForgotPassword from "./components/ForgotPassword";
import CreateAccountPage from "./pages/CreateAccountPage";
import HomePage from "./pages/Home"
import ProjectsPage from "./pages/ProjectsPage";
import CreateProjectPage from "./pages/CreateProjectsPage";
import SingleProjectPage from "./pages/SingleProjectPage";
import ProfilePage from "./pages/ProfilePage"
import RouteProtector from "./components/RouteProtector";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/create-account" element={<CreateAccountPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        
        <Route path="/profile" element={<RouteProtector>{<ProfilePage />}</RouteProtector>} />
        <Route path="/projects" element={<RouteProtector>{<ProjectsPage />}</RouteProtector>} />
        <Route path="/projects/create" element={<RouteProtector>{<CreateProjectPage />}</RouteProtector>} />
        <Route path="/projects/:projectId" element={<RouteProtector>{<SingleProjectPage />}</RouteProtector>} />
      </Routes>
    </Router>
  );
};

export default App;