import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from "./pages/LoginPage";
import CreateAccountPage from "./pages/CreateAccountPage";
import HomePage from "./pages/Home"
import ProjectsPage from "./pages/ProjectsPage";
import CreateProjectPage from "./pages/CreateProjectsPage";
import SingleProjectPage from "./pages/SingleProjectPage";

const App = () => {
  const [projects, setProjects] = useState([]);
  const addProject = (project) => {
    setProjects(prev => [...prev, project]);
  }


  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/create-account" element={<CreateAccountPage />} />
        
        <Route path="/projects" element={<ProjectsPage projects={projects} />} />
        <Route path="/projects/create" element={<CreateProjectPage addProject={addProject} />} />
        <Route path="/projects/:projectId" element={<SingleProjectPage projects={projects} />} />
      </Routes>
    </Router>
  );
};

export default App;