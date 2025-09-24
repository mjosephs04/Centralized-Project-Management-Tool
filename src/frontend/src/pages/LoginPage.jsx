import React from "react";
import { useNavigate } from "react-router-dom";
import LoginForm from "../components/LoginForm";
import '../styles/pages/LoginPage.css'

const LoginPage = () => {
    const navigate = useNavigate();
    
    return (
        <div className="login-page"> 
            <div className="top-right">
                <button 
                    className="create-account"
                    onClick={() => navigate('/create-account')}
                >Create Account</button>
            </div>
            <div className="form-wrapper">
                <LoginForm />
            </div>
        </div>
    )
};

export default LoginPage;