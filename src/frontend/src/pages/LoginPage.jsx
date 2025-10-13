import React from "react";
import { useNavigate } from "react-router-dom";
import LoginForm from "../components/LoginForm";
import backgroundImg from '../imgs/NewOnePager.svg'; 
import '../styles/pages/LoginPage.css';

const LoginPage = () => {
    const navigate = useNavigate();

    return (
        <div
            className="login-page"
            style={{
                backgroundImage: `url(${backgroundImg})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
            }}
        >
            <div className="top-right">
                <button
                    className="create-account"
                    onClick={() => navigate('/create-account')}
                >
                    Create Account
                </button>
            </div>
            <div className="form-wrapper">
                <LoginForm />
            </div>
        </div>
    );
};

export default LoginPage;
