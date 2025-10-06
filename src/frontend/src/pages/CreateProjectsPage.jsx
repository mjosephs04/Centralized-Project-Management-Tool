import React from "react";
import ProjectCreationForm from "../components/ProjectForm";
import UserNavbar from "../components/UserNavbar";

const CreateProjectPage = ({ addProject }) => {
    return (
        <>
            <UserNavbar />
            <div style={{ padding: '1rem' }}>
                <ProjectCreationForm />
            </div>
        </>
    );
};

export default CreateProjectPage;