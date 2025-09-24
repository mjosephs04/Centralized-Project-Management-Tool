import React from "react";
import { useNavigate } from "react-router-dom";
import CreateAccountForm from "../components/CreateAccountForm";
import '../styles/pages/CreateAccount.css'


const CreateAccountPage = () => {
    const navigate = useNavigate();

    return (
        <div className="create-account-page">
            <div className="login-button-wrapper">
                <button className="login-button" onClick={() => navigate('/')}>
                    Login
                </button>
            </div>
            <div className="form-container">
                <CreateAccountForm />
            </div>
        </div>
    );
};

export default CreateAccountPage;