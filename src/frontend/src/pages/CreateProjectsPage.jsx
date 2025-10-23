import React from "react";
import ProjectCreationForm from "../components/ProjectForm";
import UserNavbar from "../components/UserNavbar";

const CreateProjectPage = ({ addProject }) => {
    return (
        <>
            <UserNavbar />
            <ProjectCreationForm />
        </>
    );
};

export default CreateProjectPage;