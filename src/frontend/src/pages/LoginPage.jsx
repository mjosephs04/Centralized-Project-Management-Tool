import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LoginForm from "../components/LoginForm";
import backgroundImg from '../imgs/OnePager.png';
import '../styles/pages/LoginPage.css';

const LoginPage = () => {
    const navigate = useNavigate();
    const [imageLoaded, setImageLoaded] = useState(false);

    useEffect(() => {
        const img = new Image();
        img.src = backgroundImg;
        img.onload = () => setImageLoaded(true);
    }, []);

    return (
        <div
            className="login-page"
            style={{
                backgroundImage: imageLoaded ? `url(${backgroundImg})` : 'none',
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
