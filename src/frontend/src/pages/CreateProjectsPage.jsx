import React from "react";
import { useNavigate } from "react-router-dom";
import ProjectCreationForm from "../components/ProjectForm";
import UserNavbar from "../components/UserNavbar";

const CreateProjectPage = ({ addProject }) => {
    const navigate = useNavigate();

    const handleCreate = (newProject) => {
        addProject(newProject);
        navigate("/projects");
    };

    return (
        <>
            <UserNavbar />
            <div style={{ padding: '1rem' }}>
                <ProjectCreationForm onCreate={handleCreate} />
            </div>
        </>
    );
};

export default CreateProjectPage;